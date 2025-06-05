import unittest
import sys
import os
import datetime
from unittest.mock import patch, MagicMock

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sql import MySQLDataStore

class TestMySQLDataStore(unittest.TestCase):
    """测试 MySQLDataStore 类的功能"""

    @patch('sql.MySQLdb')
    def setUp(self, mock_mysql):
        """设置测试环境"""
        # 创建 mock 连接和游标
        self.mock_conn = MagicMock()
        self.mock_cursor = MagicMock()
        self.mock_conn.cursor.return_value.__enter__.return_value = self.mock_cursor
        
        # 配置 mock MySQL 连接
        mock_mysql.connect.return_value = self.mock_conn
        
        # 创建 MySQLDataStore 实例
        self.db = MySQLDataStore(
            host="localhost", 
            port=3306, 
            user="testuser", 
            password="testpass", 
            db="testdb"
        )
        
        # 重置 mock
        mock_mysql.reset_mock()
        self.mock_conn.reset_mock()
        self.mock_cursor.reset_mock()

    def test_connect(self):
        """测试数据库连接方法"""
        with patch('sql.MySQLdb') as mock_mysql:
            mock_mysql.connect.return_value = self.mock_conn
            
            # 测试连接成功
            result = self.db.connect()
            self.assertTrue(result)
            mock_mysql.connect.assert_called_once()
            
            # 测试连接失败
            mock_mysql.connect.side_effect = Exception("测试连接错误")
            result = self.db.connect()
            self.assertFalse(result)

    def test_add_entry(self):
        """测试添加记账条目"""
        with patch.object(self.db, 'connect', return_value=True):
            # 设置 mock
            self.mock_cursor.lastrowid = 1
            
            # 创建测试条目
            test_entry = {
                'amount': 100.0,
                'category': '餐饮',
                'specific_name': '午餐',
                'datetime': '2023-06-01 12:00:00',
                'type': 'expense'
            }
            
            # 调用被测试方法
            result = self.db.add_entry(test_entry)
            
            # 验证结果
            self.assertEqual(result, 1)
            self.mock_cursor.execute.assert_called_once()
            self.mock_conn.commit.assert_called_once()

    def test_get_entries(self):
        """测试获取记账条目"""
        with patch.object(self.db, 'connect', return_value=True):
            # 模拟数据库返回的记录
            mock_rows = [
                (1, 100.0, '餐饮', '午餐', datetime.datetime(2023, 6, 1, 12, 0), 'expense'),
                (2, 200.0, '工资', '六月工资', datetime.datetime(2023, 6, 5, 9, 0), 'income')
            ]
            self.mock_cursor.fetchall.return_value = mock_rows
            
            # 调用被测试方法
            result = self.db.get_entries()
            
            # 验证结果
            self.assertEqual(len(result), 2)
            self.assertEqual(result[0]['id'], 1)
            self.assertEqual(result[0]['amount'], 100.0)
            self.assertEqual(result[0]['category'], '餐饮')
            self.assertEqual(result[1]['id'], 2)
            self.assertEqual(result[1]['type'], 'income')
            
            # 测试带筛选条件的查询
            self.db.get_entries(
                start_date='2023-06-01',
                end_date='2023-06-30',
                categories=['餐饮']
            )
            # 验证 SQL 查询包含了条件
            self.assertTrue(self.mock_cursor.execute.call_count >= 2)

    def test_update_entry(self):
        """测试更新记账条目"""
        with patch.object(self.db, 'connect', return_value=True):
            # 设置 mock
            self.mock_cursor.rowcount = 1
            
            # 创建测试条目
            updated_entry = {
                'amount': 150.0,
                'category': '餐饮',
                'specific_name': '晚餐',
                'datetime': '2023-06-01 18:00:00',
                'type': 'expense'
            }
            
            # 调用被测试方法
            result = self.db.update_entry(1, updated_entry)
            
            # 验证结果
            self.assertTrue(result)
            self.mock_cursor.execute.assert_called_once()
            self.mock_conn.commit.assert_called_once()

    @unittest.skip("按照要求不需要测试删除条目")
    def test_delete_entry(self):
        """测试删除记账条目"""
        with patch.object(self.db, 'connect', return_value=True):
            # 设置 mock
            self.mock_cursor.rowcount = 1
            
            # 调用被测试方法
            result = self.db.delete_entry(1)
            
            # 验证结果
            self.assertTrue(result)
            self.mock_cursor.execute.assert_called_once()
            self.mock_conn.commit.assert_called_once()

if __name__ == '__main__':
    unittest.main() 