#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
运行所有测试的脚本
"""

import unittest
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == '__main__':
    # 自动发现并运行所有测试
    test_loader = unittest.TestLoader()
    test_suite = test_loader.discover(os.path.dirname(os.path.abspath(__file__)), pattern="test_*.py")
    
    # 运行测试
    test_runner = unittest.TextTestRunner(verbosity=2)
    result = test_runner.run(test_suite)
    
    # 根据测试结果设置退出代码
    if result.wasSuccessful():
        print("所有测试通过！")
        sys.exit(0)
    else:
        print("测试失败！")
        sys.exit(1) 