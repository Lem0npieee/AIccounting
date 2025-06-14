/**
 * SQLite数据存储模块
 * 
 * 负责移动设备上的SQLite数据库操作，依赖Cordova SQLite插件
 * 提供记账数据的本地存储和查询功能，专为移动应用设计
 * 
 * @module SQLiteDataStore
 */

/**
 * SQLite数据存储类
 * 提供对Cordova SQLite插件的封装
 */
class SQLiteDataStore {
  /**
   * 创建SQLite数据存储实例
   * 初始化数据库连接变量
   */
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }
  /**
   * 打开SQLite数据库连接
   * 使用Cordova SQLite插件连接本地数据库
   * 
   * @returns {Promise<boolean>} 连接成功返回true，失败返回false并抛出异常
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      try {
        // 检查cordova-sqlite-storage插件是否可用
        if (!window.sqlitePlugin) {
          console.error('SQLite插件未加载');
          reject(new Error('SQLite插件未加载'));
          return;
        }

        this.db = window.sqlitePlugin.openDatabase({
          name: 'aiccounting.db',
          location: 'default'
        });

        resolve(true);
      } catch (error) {
        console.error('数据库连接错误:', error);
        reject(error);
      }
    });
  }

  /**
   * 初始化数据库，创建必要的表
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initializeDb() {
    if (this.isInitialized) return true;

    try {
      await this.openDatabase();

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            // 创建记账条目表
            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount DECIMAL(10, 2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                specific_name VARCHAR(100),
                datetime TEXT NOT NULL,
                entry_type TEXT NOT NULL CHECK(entry_type IN ('income', 'expense')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          },
          error => {
            console.error('初始化数据库错误:', error);
            reject(error);
          },
          () => {
            this.isInitialized = true;
            resolve(true);
          }
        );
      });
    } catch (error) {
      console.error('初始化数据库连接错误:', error);
      return false;
    }
  }

  /**
   * 添加记账条目
   * @param {Object} entry 记账条目
   * @returns {Promise<number|null>} 新添加条目的ID或null
   */
  async addEntry(entry) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            const sql = `
              INSERT INTO entries (amount, category, specific_name, datetime, entry_type)
              VALUES (?, ?, ?, ?, ?)
            `;
            tx.executeSql(
              sql,
              [
                entry.amount,
                entry.category,
                entry.specific_name || '',
                entry.datetime,
                entry.type
              ],
              (tx, results) => {
                resolve(results.insertId);
              }
            );
          },
          error => {
            console.error('添加记账条目错误:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('添加记账条目连接错误:', error);
      return null;
    }
  }

  /**
   * 更新记账条目
   * @param {number} entryId 条目ID
   * @param {Object} updatedEntry 更新的条目数据
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateEntry(entryId, updatedEntry) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            const sql = `
              UPDATE entries SET
              amount = ?,
              category = ?,
              specific_name = ?,
              datetime = ?,
              entry_type = ?
              WHERE id = ?
            `;
            tx.executeSql(
              sql,
              [
                updatedEntry.amount,
                updatedEntry.category,
                updatedEntry.specific_name || '',
                updatedEntry.datetime,
                updatedEntry.type,
                entryId
              ],
              (tx, results) => {
                resolve(results.rowsAffected > 0);
              }
            );
          },
          error => {
            console.error('更新记账条目错误:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('更新记账条目连接错误:', error);
      return false;
    }
  }

  /**
   * 删除记账条目
   * @param {number} entryId 条目ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteEntry(entryId) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            const sql = 'DELETE FROM entries WHERE id = ?';
            tx.executeSql(
              sql,
              [entryId],
              (tx, results) => {
                resolve(results.rowsAffected > 0);
              }
            );
          },
          error => {
            console.error('删除记账条目错误:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('删除记账条目连接错误:', error);
      return false;
    }
  }

  /**
   * 获取记账条目
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @param {Array} categories 类别
   * @param {boolean} includeIncome 是否包含收入
   * @param {boolean} includeExpense 是否包含支出
   * @returns {Promise<Array>} 记账条目列表
   */
  async getEntries(
    startDate = null,
    endDate = null,
    categories = null,
    includeIncome = true,
    includeExpense = true
  ) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      let conditions = [];
      let params = [];

      // 构建SQL查询条件
      if (startDate) {
        conditions.push('datetime >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('datetime <= ?');
        params.push(endDate);
      }
      if (categories && categories.length > 0) {
        // SQLite参数占位符只能是?，不能像MySQL那样使用?命名参数
        const placeholders = categories.map(() => '?').join(', ');
        conditions.push(`category IN (${placeholders})`);
        params = [...params, ...categories];
      }

      // 收入/支出筛选
      const typeConditions = [];
      if (includeIncome) {
        typeConditions.push("entry_type = 'income'");
      }
      if (includeExpense) {
        typeConditions.push("entry_type = 'expense'");
      }

      if (typeConditions.length > 0) {
        conditions.push(`(${typeConditions.join(' OR ')})`);
      }

      // 构建完整SQL
      let sql = 'SELECT id, amount, category, specific_name, datetime, entry_type FROM entries';
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY datetime DESC';

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            tx.executeSql(
              sql,
              params,
              (tx, results) => {
                const entries = [];
                for (let i = 0; i < results.rows.length; i++) {
                  const row = results.rows.item(i);
                  entries.push({
                    id: row.id,
                    amount: parseFloat(row.amount),
                    category: row.category,
                    specific_name: row.specific_name,
                    datetime: row.datetime,
                    type: row.entry_type
                  });
                }
                resolve(entries);
              }
            );
          },
          error => {
            console.error('获取记账条目错误:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('获取记账条目连接错误:', error);
      return [];
    }
  }

  /**
   * 获取指定日期的收支统计
   * @param {string} date 日期
   * @returns {Promise<Object>} 收支统计
   */
  async getDailyStats(date) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      // 构造日期范围查询条件
      const startDate = `${date} 00:00:00`;
      const endDate = `${date} 23:59:59`;

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            // 查询收入总和
            tx.executeSql(
              "SELECT COALESCE(SUM(amount), 0) as total FROM entries WHERE datetime BETWEEN ? AND ? AND entry_type = 'income'",
              [startDate, endDate],
              (tx, incomeResults) => {
                const income = incomeResults.rows.item(0).total || 0;

                // 查询支出总和
                tx.executeSql(
                  "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM entries WHERE datetime BETWEEN ? AND ? AND entry_type = 'expense'",
                  [startDate, endDate],
                  (tx, expenseResults) => {
                    const expense = expenseResults.rows.item(0).total || 0;
                    
                    resolve({
                      income: parseFloat(income),
                      expense: parseFloat(expense),
                      net: parseFloat(income) - parseFloat(expense)
                    });
                  }
                );
              }
            );
          },
          error => {
            console.error('获取日统计错误:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('获取日统计连接错误:', error);
      return { income: 0, expense: 0, net: 0 };
    }
  }

  /**
   * 获取按类别分组的支出统计
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @returns {Promise<Array>} 类别统计
   */
  async getCategoryStats(startDate = null, endDate = null) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      let conditions = [];
      let params = [];

      if (startDate) {
        conditions.push('datetime >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('datetime <= ?');
        params.push(endDate);
      }

      // 按支出类别分组统计
      let sql = "SELECT category, SUM(ABS(amount)) as total FROM entries WHERE entry_type = 'expense'";

      if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
      }

      sql += ' GROUP BY category ORDER BY total DESC';

      return new Promise((resolve, reject) => {
        this.db.transaction(
          tx => {
            tx.executeSql(
              sql,
              params,
              (tx, results) => {
                const stats = [];
                for (let i = 0; i < results.rows.length; i++) {
                  const row = results.rows.item(i);
                  stats.push({
                    category: row.category,
                    amount: parseFloat(row.total)
                  });
                }
                resolve(stats);
              }
            );
          },
          error => {
            console.error('获取类别统计错误:', error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('获取类别统计连接错误:', error);
      return [];
    }
  }
}

export default SQLiteDataStore;