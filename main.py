"""
主程序入口文件
负责启动应用程序、连接AI助手和数据库
"""

from chat import AIAccountant
from sql import MySQLDataStore
import sys

def main():
    """主函数，程序入口点"""
    print("🤖 正在初始化AI记账助手...")
    
    # 初始化数据库连接
    try:
        db = MySQLDataStore(
            host="localhost", 
            port=3306, 
            user="root", 
            password="512560", 
            db="data"
        )
        
        # 测试数据库连接
        if not db.connect():
            print("❌ 数据库连接失败，请检查数据库配置")
            sys.exit(1)
        db.close()
        
        print("✅ 数据库连接成功")
    except Exception as e:
        print(f"❌ 数据库初始化错误: {e}")
        sys.exit(1)
    
    # 初始化AI记账助手
    ai_accountant = AIAccountant(db)
    
    print("\n🤖 欢迎使用AI记账助手！")
    print("👉 您可以直接输入收支情况，例如：'今天午饭花了35元'")
    print("👉 或者查询报表，例如：'帮我分析本月的消费情况'")
    print("👉 也可以与我闲聊，我会以助手的身份回答您的问题")
    print("👉 输入'退出'或'exit'结束对话")
    print("-" * 50)
    
    # 主对话循环
    while True:
        user_input = input("\n💬 请输入: ")
        
        # 检查退出命令
        if user_input.lower() in ['退出', 'exit', 'quit']:
            print("👋 感谢使用AI记账助手，再见！")
            break
            
        print("\n🤔 AI记账助手思考中...")
        
        try:
            response = ai_accountant.process_user_message(user_input)
            print(f"\n🤖 AI记账助手: {response}")
        except Exception as e:
            print(f"❌ 处理消息时出错: {e}")


if __name__ == "__main__":
    main()
