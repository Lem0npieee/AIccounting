/**
 * LocalForage数据存储模块
 * 
 * 使用localforage库实现本地数据的持久化存储，提供记账数据的CRUD操作
 * 作为SQLite的替代方案，兼容更多平台环境
 * 
 * @module LocalForageDataStore
 */
import localforage from 'localforage';

/**
 * LocalForage数据存储类
 * 负责管理本地数据的持久化和查询操作
 */
class LocalForageDataStore {
  /**
   * 创建数据存储实例
   * 初始化存储状态和实例变量
   */
  constructor() {
    this.isInitialized = false;
    this.entriesStore = null;
  }
  /**
   * 初始化本地存储数据库
   * 配置localforage实例并创建必要的存储空间
   * 
   * @returns {Promise<boolean>} 初始化成功返回true，失败返回false
   */
  async initializeDb() {
    if (this.isInitialized) return true;

    try {
      console.log('初始化 localforage 数据库...');
      
      // 配置主存储实例
      localforage.config({
        name: 'AIccounting',
        storeName: 'entries', // 默认存储名称
        description: 'AI记账助手的本地数据存储'
      });
      
      // 创建单独的存储实例用于账目数据
      this.entriesStore = localforage.createInstance({
        name: 'AIccounting',
        storeName: 'entries'
      });
      
      // 检查数据库是否正常工作
      await this.entriesStore.setItem('__test__', 'ok');
      const test = await this.entriesStore.getItem('__test__');
      if (test !== 'ok') {
        throw new Error('localforage 实例测试失败');
      }
      await this.entriesStore.removeItem('__test__');
      
      console.log('localforage 数据库初始化成功');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('初始化 localforage 数据库错误:', error);
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

      console.log('准备添加记账条目:', entry);
      
      // 获取所有现有条目
      let entries = await this.getAllEntries();
      
      // 生成新的ID (自增)
      const newId = entries.length > 0 
        ? Math.max(...entries.map(e => e.id || 0)) + 1 
        : 1;
      
      // 创建新条目对象
      const newEntry = {
        id: newId,
        amount: parseFloat(entry.amount),
        category: entry.category || entry.categoryTag || '其他',
        specific_name: entry.specific_name || entry.specificName || '',
        datetime: entry.datetime || entry.time || new Date().toISOString(),
        entry_type: entry.entry_type || entry.type || 'expense',
        created_at: new Date().toISOString()
      };
      
      // 添加到数组
      entries.push(newEntry);
      
      // 保存回 localforage
      await this.entriesStore.setItem('entries', entries);
      
      console.log(`成功添加记账条目, ID: ${newId}`);
      return newId;
    } catch (error) {
      console.error('添加记账条目错误:', error);
      return null;
    }
  }

  /**
   * 获取所有记账条目
   * @returns {Promise<Array>} 记账条目数组
   */
  async getAllEntries() {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }
      
      const entries = await this.entriesStore.getItem('entries');
      return Array.isArray(entries) ? entries : [];
    } catch (error) {
      console.error('获取所有记账条目错误:', error);
      return [];
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

      // 获取所有条目
      let entries = await this.getAllEntries();
      
      // 查找要更新的条目
      const index = entries.findIndex(entry => entry.id === entryId);
      if (index === -1) {
        console.error(`未找到ID为 ${entryId} 的记账条目`);
        return false;
      }
      
      // 更新条目
      entries[index] = {
        ...entries[index],
        amount: updatedEntry.amount !== undefined ? parseFloat(updatedEntry.amount) : entries[index].amount,
        category: updatedEntry.category || updatedEntry.categoryTag || entries[index].category,
        specific_name: updatedEntry.specific_name || updatedEntry.specificName || entries[index].specific_name,
        datetime: updatedEntry.datetime || updatedEntry.time || entries[index].datetime,
        entry_type: updatedEntry.entry_type || updatedEntry.type || entries[index].entry_type
      };
      
      // 保存回 localforage
      await this.entriesStore.setItem('entries', entries);
      
      return true;
    } catch (error) {
      console.error('更新记账条目错误:', error);
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

      // 获取所有条目
      let entries = await this.getAllEntries();
      
      // 过滤掉要删除的条目
      const newEntries = entries.filter(entry => entry.id !== entryId);
      
      // 如果长度相同，说明没有找到要删除的条目
      if (newEntries.length === entries.length) {
        console.error(`未找到ID为 ${entryId} 的记账条目`);
        return false;
      }
      
      // 保存回 localforage
      await this.entriesStore.setItem('entries', newEntries);
      
      return true;
    } catch (error) {
      console.error('删除记账条目错误:', error);
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

      console.log('获取记账条目, 筛选条件:', {
        startDate,
        endDate,
        categories,
        includeIncome,
        includeExpense
      });

      // 获取所有条目
      let entries = await this.getAllEntries();
        // 应用筛选条件
      const filteredEntries = entries.filter(entry => {        // 日期筛选
        try {
          // 处理日期字符串，确保使用相同标准比较
          const entryDateTime = entry.datetime;
          // 统一提取日期部分 (YYYY-MM-DD) 进行比较
          const entryDatePart = entryDateTime.includes('T') 
            ? entryDateTime.split('T')[0] 
            : entryDateTime.split(' ')[0];
          
          // 将日期提取为可比较的变量
          const startDatePart = startDate ? (startDate.includes('T') ? startDate.split('T')[0] : startDate.split(' ')[0]) : null;
          const endDatePart = endDate ? (endDate.includes('T') ? endDate.split('T')[0] : endDate.split(' ')[0]) : null;
          
          console.log(`比较日期: ${entryDatePart} 与 ${startDatePart} - ${endDatePart}`);
          
          // 使用字符串比较（YYYY-MM-DD格式可以直接比较）
          if (startDatePart && entryDatePart < startDatePart) {
            return false;
          }
          if (endDatePart && entryDatePart > endDatePart) {
            return false;
          }
        } catch (e) {
          console.error("日期比较错误:", e);
          return false;
        }
        // 类型筛选
        if (!includeIncome && entry.entry_type === 'income') {
          return false;
        }
        if (!includeExpense && entry.entry_type === 'expense') {
          return false;
        }
        
        // 类别筛选
        if (categories && categories.length > 0 && !categories.includes(entry.category)) {
          return false;
        }
        
        return true;
      });
      
      // 按日期降序排序
      filteredEntries.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
      
      // 转换为API预期的格式
      return filteredEntries.map(entry => {
        // 确保datetime格式一致 (YYYY-MM-DD HH:MM:SS)
        let formattedDatetime = entry.datetime;
        if (formattedDatetime.includes('T')) {
          formattedDatetime = formattedDatetime.replace('T', ' ').substring(0, 19);
        }
        
        return {
          id: entry.id,
          amount: entry.amount,
          category: entry.category,
          specific_name: entry.specific_name,
          datetime: formattedDatetime,
          type: entry.entry_type
        };
      });
    } catch (error) {
      console.error('获取记账条目错误:', error);
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
      const startDate = `${date}T00:00:00`;
      const endDate = `${date}T23:59:59`;
      
      // 获取当天的交易记录
      const entries = await this.getEntries(startDate, endDate);
      
      // 计算收入和支出
      let income = 0;
      let expense = 0;
      
      for (const entry of entries) {
        if (entry.type === 'income') {
          income += parseFloat(entry.amount);
        } else if (entry.type === 'expense') {
          expense += Math.abs(parseFloat(entry.amount));
        }
      }
      
      return {
        income,
        expense,
        net: income - expense
      };
    } catch (error) {
      console.error('获取日统计错误:', error);
      return { income: 0, expense: 0, net: 0 };
    }
  }

  /**
   * 获取月度统计
   * @param {number} year 年份
   * @param {number} month 月份
   * @returns {Promise<Object>} 月度统计
   */
  async getMonthlyStats(year, month) {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      // 构造日期范围
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      // 格式化为ISO字符串
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      
      // 获取当月的交易记录
      const entries = await this.getEntries(startDateStr, endDateStr);
      
      // 计算收入和支出
      let income = 0;
      let expense = 0;
      
      for (const entry of entries) {
        if (entry.type === 'income') {
          income += parseFloat(entry.amount);
        } else if (entry.type === 'expense') {
          expense += Math.abs(parseFloat(entry.amount));
        }
      }
      
      return {
        income,
        expense,
        net: income - expense
      };
    } catch (error) {
      console.error('获取月统计错误:', error);
      return { income: 0, expense: 0, net: 0 };
    }
  }

  /**
   * 清除所有数据
   * @returns {Promise<boolean>} 操作是否成功
   */
  async clearAllData() {
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }

      await this.entriesStore.clear();
      console.log('所有数据已清除');
      return true;
    } catch (error) {
      console.error('清除数据错误:', error);
      return false;
    }
  }

  /**
   * 检查并修复数据库
   * @returns {Promise<boolean>} 检查结果
   */
  async checkAndRepairDatabase() {
    console.log('检查数据库状态...');
    
    try {
      if (!this.isInitialized) {
        await this.initializeDb();
      }
      
      // 尝试读取条目以验证数据库完整性
      const entries = await this.getAllEntries();
      console.log(`数据库正常，共有 ${entries.length} 条记录`);
      return true;
    } catch (error) {
      console.error('数据库检查失败，尝试修复:', error);
      
      try {
        // 重新初始化
        this.isInitialized = false;
        await this.initializeDb();
        console.log('数据库已重新初始化');
        return true;
      } catch (repairError) {
        console.error('修复数据库失败:', repairError);
        return false;
      }
    }
  }
}

export default LocalForageDataStore;