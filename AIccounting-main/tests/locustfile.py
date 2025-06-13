from locust import HttpUser, task, between, TaskSet
import random
import datetime
import time
import json

class AIAccountingUser(HttpUser):
    """AI记账系统用户，模拟真实业务流程"""
    wait_time = between(1, 3)  # 更接近真实的用户操作间隔
    
    def on_start(self):
        """用户开始行为时，先初始化会话"""
        # 调用AI助手启动API，模拟用户打开应用
        self.client.post("/api/start")
    
    @task(4)  # 权重4，表示这是最常见的操作
    def record_expense_flow(self):
        """记录支出并查看图表流程"""
        # 1. 随机生成一个支出记账信息
        amount = round(random.uniform(10, 500), 2)
        category = random.choice(["餐饮", "交通", "购物", "娱乐", "住房", "医疗", "教育"])
        specifics = random.choice(["午餐", "晚餐", "打车", "地铁", "超市", "电影", "衣服", "房租"])
        
        # 2. 通过对话方式记一笔账
        chat_message = f"我{random.choice(['刚刚','今天','刚才'])}花了{amount}元{random.choice(['在','买了','支付了'])}{category}，{specifics}"
        chat_response = self.client.post("/api/chat", json={"message": chat_message})
        
        if chat_response.status_code == 200:
            # 3. 查询记账列表 (确认刚才的记账已保存)
            current_date = datetime.datetime.now().strftime("%Y-%m-%d")
            transaction_response = self.client.get(f"/get_transaction_list_for_frontend?start_date={current_date}&end_date={current_date}")
            
            # 4. 获取图表数据，模拟用户查看分析
            self.client.post("/get_chart_data_from_filters", 
                json={
                    "time_period": "this_month",
                    "income_expense_focus": "expense",
                    "chart_type": "pie"
                }
            )
    
    @task(2)  # 权重2，次常见的操作
    def record_income_flow(self):
        """记录收入并查看明细流程"""
        # 1. 随机生成一个收入记账信息
        amount = round(random.uniform(1000, 10000), 2)
        category = random.choice(["工资", "奖金", "投资", "兼职", "其他收入"])
        
        # 2. 通过对话方式记一笔账
        chat_message = f"我{random.choice(['收到了','获得了','得到了'])}{amount}元{category}收入"
        chat_response = self.client.post("/api/chat", json={"message": chat_message})
        
        if chat_response.status_code == 200:
            # 3. 查询记账列表 (查看历史账单)
            last_month = (datetime.datetime.now() - datetime.timedelta(days=30)).strftime("%Y-%m-%d")
            current_date = datetime.datetime.now().strftime("%Y-%m-%d")
            transaction_response = self.client.get(f"/get_transaction_list_for_frontend?start_date={last_month}&end_date={current_date}")
            
            # 4. 获取收入趋势分析
            self.client.post("/get_chart_data_from_filters", 
                json={
                    "time_period": "this_month",
                    "income_expense_focus": "income",
                    "chart_type": "line"
                }
            )
    
    @task(1)  # 权重1，代表较少执行
    def analysis_flow(self):
        """深入分析财务数据流程"""
        # 生成搜索范围：最近3个月
        end_date = datetime.datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.datetime.now() - datetime.timedelta(days=90)).strftime("%Y-%m-%d")
        
        # 1. 先查看完整账单列表
        self.client.get(f"/get_transaction_list_for_frontend?start_date={start_date}&end_date={end_date}")
        
        # 2. 查看支出分布饼图
        self.client.post("/get_chart_data_from_filters", 
            json={
                "start_date": start_date,
                "end_date": end_date,
                "income_expense_focus": "expense",
                "chart_type": "pie",
                "expense_categories": ["餐饮", "交通", "购物"]  # 筛选特定类别
            }
        )
        
        # 3. 查看收入支出趋势
        self.client.post("/get_chart_data_from_filters", 
            json={
                "start_date": start_date,
                "end_date": end_date,
                "income_expense_focus": "net_income",
                "chart_type": "line",
                "time_unit": "month"
            }
        )
        
        # 4. 通过AI助手询问分析建议
        self.client.post("/api/chat", 
            json={"message": random.choice([
                "我的消费情况怎么样？",
                "我哪个类别花钱最多？",
                "有什么省钱建议？",
                "我的收入和支出比例健康吗？"
            ])}
        )

    @task(3)  # 权重3，常见的查询
    def quick_query_flow(self):
        """快速查询账单流程"""
        # 随机选择一个时间段查询
        time_period = random.choice(["today", "this_week", "this_month", "本月"])
        
        # 1. 通过时间段查询账单
        self.client.get(f"/get_transaction_list_for_frontend?time_period={time_period}")
        
        # 2. 查看简单统计
        self.client.post("/get_chart_data_from_filters", 
            json={"time_period": time_period}
        ) 