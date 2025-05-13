import MySQLdb
import datetime
import json


class MySQLDataStore:
    """数据库操作类，负责与MySQL数据库的交互"""

    def __init__(self, host="localhost", port=3306, user="root", password="512560", db="data"):
        """初始化数据库连接"""
        self.db_config = {
            'host': host,
            'port': port,
            'user': user,
            'passwd': password,
            'db': db,
            'charset': 'utf8mb4'
        }
        self.connection = None
        self.initialize_db()

    def connect(self):
        """连接到数据库"""
        try:
            self.connection = MySQLdb.connect(**self.db_config)
            return True
        except Exception as e:
            print(f"数据库连接错误: {e}")
            return False

    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()

    def initialize_db(self):
        """初始化数据库，创建必要的表"""
        if not self.connect():
            return False

        try:
            with self.connection.cursor() as cursor:
                # 创建记账条目表
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS entries (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    amount DECIMAL(10, 2) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    specific_name VARCHAR(100),
                    datetime DATETIME NOT NULL,
                    entry_type ENUM('income', 'expense') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """)
            self.connection.commit()
            return True
        except Exception as e:
            print(f"初始化数据库错误: {e}")
            return False
        finally:
            self.close()

    def add_entry(self, entry):
        """添加记账条目"""
        if not self.connect():
            return None

        try:
            with self.connection.cursor() as cursor:
                sql = """
                INSERT INTO entries (amount, category, specific_name, datetime, entry_type)
                VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(
                    sql, 
                    (
                        entry['amount'], 
                        entry['category'], 
                        entry.get('specific_name', ''), 
                        entry['datetime'],
                        entry['type']
                    )
                )
                self.connection.commit()
                entry_id = cursor.lastrowid
                return entry_id
        except Exception as e:
            print(f"添加记账条目错误: {e}")
            return None
        finally:
            self.close()

    def update_entry(self, entry_id, updated_entry):
        """更新记账条目"""
        if not self.connect():
            return False

        try:
            with self.connection.cursor() as cursor:
                sql = """
                UPDATE entries SET 
                amount = %s, 
                category = %s, 
                specific_name = %s, 
                datetime = %s, 
                entry_type = %s
                WHERE id = %s
                """
                cursor.execute(
                    sql,
                    (
                        updated_entry.get('amount'),
                        updated_entry.get('category'),
                        updated_entry.get('specific_name', ''),
                        updated_entry.get('datetime'),
                        updated_entry.get('type'),
                        entry_id
                    )
                )
                self.connection.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"更新记账条目错误: {e}")
            return False
        finally:
            self.close()

    def delete_entry(self, entry_id):
        """删除记账条目"""
        if not self.connect():
            return False

        try:
            with self.connection.cursor() as cursor:
                sql = "DELETE FROM entries WHERE id = %s"
                cursor.execute(sql, (entry_id,))
                self.connection.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"删除记账条目错误: {e}")
            return False
        finally:
            self.close()

    def get_entries(self, start_date=None, end_date=None, categories=None, include_income=True, include_expense=True):
        """获取记账条目"""
        if not self.connect():
            return []

        try:
            with self.connection.cursor() as cursor:
                conditions = []
                params = []

                # 构建SQL查询条件
                if start_date:
                    conditions.append("datetime >= %s")
                    params.append(start_date)
                if end_date:
                    conditions.append("datetime <= %s")
                    params.append(end_date)
                if categories:
                    placeholders = ", ".join(["%s"] * len(categories))
                    conditions.append(f"category IN ({placeholders})")
                    params.extend(categories)

                # 收入/支出筛选
                type_conditions = []
                if include_income:
                    type_conditions.append("entry_type = 'income'")
                if include_expense:
                    type_conditions.append("entry_type = 'expense'")

                if type_conditions:
                    conditions.append(f"({' OR '.join(type_conditions)})")

                # 构建完整SQL
                sql = "SELECT id, amount, category, specific_name, datetime, entry_type FROM entries"
                if conditions:
                    sql += " WHERE " + " AND ".join(conditions)
                sql += " ORDER BY datetime DESC"

                cursor.execute(sql, tuple(params))
                rows = cursor.fetchall()
                
                # 处理结果
                entries = []
                for row in rows:
                    entry = {
                        "id": row[0],
                        "amount": float(row[1]),
                        "category": row[2],
                        "specific_name": row[3],
                        "datetime": row[4].strftime("%Y-%m-%d %H:%M:%S"),
                        "type": row[5]
                    }
                    entries.append(entry)
                
                return entries
        except Exception as e:
            print(f"获取记账条目错误: {e}")
            return []
        finally:
            self.close()
            
    def get_daily_stats(self, date):
        """获取指定日期的收支统计"""
        if not self.connect():
            return {"income": 0, "expense": 0}
            
        try:
            with self.connection.cursor() as cursor:
                # 构造日期范围查询条件
                start_date = f"{date} 00:00:00"
                end_date = f"{date} 23:59:59"
                
                # 查询收入总和
                cursor.execute(
                    "SELECT IFNULL(SUM(amount), 0) FROM entries WHERE datetime BETWEEN %s AND %s AND entry_type = 'income'",
                    (start_date, end_date)
                )
                income = cursor.fetchone()[0] or 0
                
                # 查询支出总和
                cursor.execute(
                    "SELECT IFNULL(SUM(ABS(amount)), 0) FROM entries WHERE datetime BETWEEN %s AND %s AND entry_type = 'expense'",
                    (start_date, end_date)
                )
                expense = cursor.fetchone()[0] or 0
                
                return {
                    "income": float(income),
                    "expense": float(expense),
                    "net": float(income) - float(expense)
                }
        except Exception as e:
            print(f"获取日统计错误: {e}")
            return {"income": 0, "expense": 0, "net": 0}
        finally:
            self.close()
            
    def get_category_stats(self, start_date=None, end_date=None):
        """获取按类别分组的支出统计"""
        if not self.connect():
            return []
            
        try:
            with self.connection.cursor() as cursor:
                params = []
                conditions = []
                
                if start_date:
                    conditions.append("datetime >= %s")
                    params.append(start_date)
                if end_date:
                    conditions.append("datetime <= %s")
                    params.append(end_date)
                    
                # 按支出类别分组统计
                sql = """
                SELECT category, SUM(ABS(amount)) as total 
                FROM entries 
                WHERE entry_type = 'expense' 
                """
                
                if conditions:
                    sql += " AND " + " AND ".join(conditions)
                    
                sql += " GROUP BY category ORDER BY total DESC"
                
                cursor.execute(sql, tuple(params))
                rows = cursor.fetchall()
                
                return [{"category": row[0], "amount": float(row[1])} for row in rows]
        except Exception as e:
            print(f"获取类别统计错误: {e}")
            return []
        finally:
            self.close()

if __name__ == "__main__":
    db = MySQLDataStore()
    db.initialize_db()
    print("数据库初始化完成")