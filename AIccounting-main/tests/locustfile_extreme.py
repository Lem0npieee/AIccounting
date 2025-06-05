from locust import HttpUser, task, between
import random
import datetime

class ExtremeChatApiUser(HttpUser):
    """专门用于对话写入API的极限压力测试"""
    wait_time = between(0.01, 0.05)  # 极短等待时间，模拟高并发
    
    @task
    def chat_add_entry(self):
        """纯粹的对话记账API测试，无其他流程干扰"""
        amount = round(random.uniform(10, 1000), 2)
        category = random.choice(["餐饮", "交通", "购物", "娱乐", "工资"])
        msg = f"我花了{amount}元在{category}"
        self.client.post("/api/chat", json={"message": msg})


class ExtremeQueryApiUser(HttpUser):
    """专门用于查询API的极限压力测试"""
    wait_time = between(0.01, 0.05)  # 极短等待时间，模拟高并发
    
    @task
    def query_transactions(self):
        """纯粹的查询API测试，无其他流程干扰"""
        # 选择随机的时间范围
        days_back = random.randint(1, 90)
        end_date = datetime.datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        # 调用查询API
        self.client.get(f"/get_transaction_list_for_frontend?start_date={start_date}&end_date={end_date}")


class ExtremeChartApiUser(HttpUser):
    """专门用于图表数据API的极限压力测试"""
    wait_time = between(0.01, 0.05)  # 极短等待时间，模拟高并发
    
    @task
    def get_chart_data(self):
        """纯粹的图表数据API测试，无其他流程干扰"""
        # 选择随机的图表参数
        chart_type = random.choice(["pie", "line"])
        income_expense_focus = random.choice(["income", "expense", "net_income"])
        time_period = random.choice(["today", "this_week", "this_month"])
        
        # 调用图表API
        self.client.post("/get_chart_data_from_filters", 
            json={
                "time_period": time_period,
                "income_expense_focus": income_expense_focus,
                "chart_type": chart_type
            })


# 运行说明:
# 1. 默认情况下会运行所有用户类型，可用 --class-picker 选择特定用户类型
# 2. 示例: locust -f locustfile_extreme.py --host=http://127.0.0.1:5000 --class-picker
#    然后选择 ExtremeChatApiUser 进行纯写入API测试
# 3. 推荐设置大量用户(如1000-5000)和高速出生率(如100-500/秒)来测试系统极限 