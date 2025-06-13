import unittest
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class TestBasic(unittest.TestCase):
    """基本测试类，确保测试框架能正确加载"""
    
    def test_true(self):
        """最基本的测试，总是通过"""
        self.assertTrue(True)
    
    def test_python_version(self):
        """测试Python版本信息"""
        # 只要能运行测试就会通过，主要用于显示Python版本信息
        python_version = sys.version
        print(f"\nPython版本: {python_version}")
        self.assertTrue(python_version.startswith("3"))  # 确保是Python 3

if __name__ == '__main__':
    unittest.main() 