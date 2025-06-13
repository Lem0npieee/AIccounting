import unittest
import sys
import os
import json
import datetime
from unittest.mock import patch, MagicMock

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app, get_filtered_transaction_list_api, get_summary_statistics_api

class TestAPIFunctions(unittest.TestCase):
    """测试API功能函数"""
    
    def setUp(self):
        """设置测试环境"""
        # 配置Flask测试客户端
        app.testing = True
        self.client = app.test_client()
        
        # 创建测试数据
        self.test_transactions = [
            {
                'id': 1,
                'amount': 100.0,
                'category': '餐饮',
                'specific_name': '午餐',
                'datetime': '2023-06-01 12:00:00',
                'type': 'expense'
            },
            {
                'id': 2,
                'amount': 200.0,
                'category': '工资',
                'specific_name': '六月工资',
                'datetime': '2023-06-05 09:00:00',
                'type': 'income'
            }
        ]

    @patch('api._get_db')
    def test_get_filtered_transaction_list_api(self, mock_get_db):
        """测试获取过滤后的交易列表API函数"""
        # 设置模拟数据库返回值
        mock_db = MagicMock()
        mock_db.get_entries.return_value = self.test_transactions
        mock_get_db.return_value = mock_db
        
        # 测试无筛选条件
        result = get_filtered_transaction_list_api()
        self.assertEqual(len(result), 2)
        
        # 测试日期筛选
        result = get_filtered_transaction_list_api(
            start_date_str='2023-06-01',
            end_date_str='2023-06-30'
        )
        self.assertEqual(len(result), 2)
        
        # 测试类型筛选
        result = get_filtered_transaction_list_api(
            income_expense_type='expense'
        )
        # 在mock环境中，结果仍然是2，因为过滤是在SQL查询中进行的
        # 我们只验证参数传递是否正确
        mock_db.get_entries.assert_called_with(
            start_date=None,
            end_date=None,
            categories=None,
            include_income=False,
            include_expense=True
        )

    @patch('api.get_filtered_transaction_list_api')
    def test_get_summary_statistics_api(self, mock_get_filtered):
        """测试获取汇总统计数据API函数"""
        # 设置模拟返回值
        mock_get_filtered.return_value = self.test_transactions
        
        # 调用被测试函数
        result = get_summary_statistics_api()
        
        # 验证结果
        self.assertEqual(result['total_income'], 200.0)
        self.assertEqual(result['total_expense'], 100.0)
        self.assertEqual(result['net_income'], 100.0)
        self.assertEqual(result['total_flow'], 300.0)

class TestAPIRoutes(unittest.TestCase):
    """测试API路由"""
    
    def setUp(self):
        """设置测试环境"""
        app.testing = True
        self.client = app.test_client()
        
        # 测试数据
        self.test_transactions = [
            {
                'id': 1,
                'amount': 100.0,
                'category': '餐饮',
                'specific_name': '午餐',
                'datetime': datetime.datetime(2023, 6, 1, 12, 0),
                'type': 'expense'
            },
            {
                'id': 2,
                'amount': 200.0,
                'category': '工资',
                'specific_name': '六月工资',
                'datetime': datetime.datetime(2023, 6, 5, 9, 0),
                'type': 'income'
            }
        ]
    
    @patch('api.get_filtered_transaction_list_api')
    @patch('api.get_summary_statistics_api')
    def test_get_transaction_list_for_frontend_route(self, mock_summary, mock_filtered):
        """测试获取前端交易列表路由"""
        # 设置模拟返回值
        mock_filtered.return_value = self.test_transactions
        mock_summary.return_value = {
            'total_income': 200.0,
            'total_expense': 100.0,
            'net_income': 100.0,
            'total_flow': 300.0
        }
        
        # 发送GET请求
        response = self.client.get('/get_transaction_list_for_frontend?start_date=2023-06-01&end_date=2023-06-30')
        
        # 验证响应
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('transactions', data)
        self.assertIn('summary', data)
        self.assertEqual(len(data['transactions']), 2)
        
        # 验证是否传递了正确的参数
        mock_filtered.assert_called_with(
            start_date_str='2023-06-01',
            end_date_str='2023-06-30'
        )
        mock_summary.assert_called_with(
            start_date_str='2023-06-01',
            end_date_str='2023-06-30'
        )

    @patch('api.get_category_distribution_api')
    def test_get_category_distribution_route(self, mock_category_dist):
        """测试获取类别分布路由"""
        # 设置模拟返回值
        mock_category_dist.return_value = [
            {'category': '餐饮', 'value': 100.0},
            {'category': '工资', 'value': 200.0}
        ]
        
        # 使用get_chart_data_from_filters路由来测试类别分布
        # 由于实际使用的是POST请求带JSON数据，而不是/get_category_distribution路由
        response = self.client.post('/get_chart_data_from_filters', 
                                  json={
                                      'time_period': 'this_month',
                                      'income_expense_focus': 'expense'
                                  })
        
        # 验证响应
        self.assertEqual(response.status_code, 200)
        # 验证返回的数据结构中应包含类别分布数据
        # 因为是mock，所以我们只检查响应状态码，而不详细检查响应内容

if __name__ == '__main__':
    unittest.main() 