"""
AI聊天模块：处理用户消息，集成大语言模型，提供记账和分析功能
"""
import requests
import json
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt
from tqdm import tqdm
import re
import datetime
import os

# DeepSeek API配置
DEEPSEEK_API_KEY = "sk-3b7ab35452b34c22b825f7d617501fd8"
API_URL = "https://api.deepseek.com/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    "Content-Type": "application/json"
}

def query_deepseek(prompt, language="zh", temperature=0):
    """调用DeepSeek API发送查询
    
    Args:
        prompt: 提示词文本
        language: 语言，默认中文
        temperature: 温度参数，控制生成多样性
    
    Returns:
        API返回的文本内容或None
    """
    data = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": 2000
    }
    response = requests.post(API_URL, headers=headers, json=data)
    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        print(f"Error: {response.status_code}")
        return None

class AIAccountant:
    """AI记账助手类：处理用户消息，提取记账信息，生成回复"""
    
    def __init__(self, data_store):
        """初始化AI记账助手
        
        Args:
            data_store: 数据存储实例
        """
        self.data_store = data_store
        # 预设账目类别
        self.default_categories = {
            "收入": ["工资", "奖金", "补贴", "兼职", "投资", "其他收入"],
            "支出": ["餐饮", "购物", "交通", "住房", "娱乐", "教育", "医疗", "日用品", "其他支出"]
        }
    def _extract_accounting_info(self, user_message):
        """从用户消息中提取记账信息
        
        Args:
            user_message: 用户输入的消息文本
            
        Returns:
            解析出的记账信息列表或None
        """
        # 构建提示词，指导AI模型提取所需信息
        prompt = f"""
        请从以下用户输入中提取所有的记账信息，并严格按照JSON数组格式返回。用户可能会在一句话中提到多笔交易。
        
        如果用户输入明显不是记账内容（如问候、闲聊、咨询等），请在返回的JSON中设置一个额外字段"is_accounting"为false。
        
        用户输入: {user_message}
        
        对于每笔交易，请提取以下信息:
        1. 金额 (amount): 数值，收入为正数，支出为负数，如无明确表示是收入还是支出，默认为支出(负数)
        2. 类别 (category): 对应的消费或收入类别
           - 收入类别只能是: "工资", "奖金", "补贴", "兼职", "投资", "其他收入"
           - 支出类别只能是: "餐饮", "购物", "交通", "住房", "娱乐", "教育", "医疗", "日用品", "其他支出"
           - 如果无法确定类别归属，收入请使用"其他收入"，支出请使用"其他支出"
        3. 具体名称 (specific_name): 具体的消费项目或收入来源
        4. 日期时间 (datetime): 格式为 YYYY-MM-DD HH:MM:SS，如未指定则使用当前时间
        5. 消费/收入类型 (type): "income"(收入)或"expense"(支出)
        5. 消费/收入类型 (type): "income"(收入)或"expense"(支出)
        
        返回格式要求：
        如果只有一笔交易，返回单个JSON对象:
        {{
            "amount": 数值,
            "category": "类别",
            "specific_name": "具体名称",
            "datetime": "YYYY-MM-DD HH:MM:SS",
            "type": "income或expense"
        }}
        
        如果识别到多笔交易，则返回一个JSON数组，每个元素都是一个完整的交易记录:
        [
            {{
                "amount": 数值,
                "category": "类别",
                "specific_name": "具体名称",
                "datetime": "YYYY-MM-DD HH:MM:SS",
                "type": "income或expense"
            }},
            {{
                "amount": 数值,
                "category": "类别",
                "specific_name": "具体名称",
                "datetime": "YYYY-MM-DD HH:MM:SS",
                "type": "income或expense"
            }},
            ...
        ]
        
        如果无法识别任何记账信息，返回:
        {{"is_accounting": false}}
        
        仅返回JSON格式的结果，不要有任何其他解释性文字。
        """
        
        try:
            response = query_deepseek(prompt)
            # 提取JSON部分
            if response:
                match = re.search(r'(\[[\s\S]*\]|\{[\s\S]*\})', response)
                if match:
                    json_str = match.group(1)
                    data = json.loads(json_str)
                    
                    # 检查是否为字典，且不是记账内容
                    if isinstance(data, dict) and not data.get("is_accounting", True):
                        return None
                    
                    # 将单个条目转换为列表格式
                    entries = data if isinstance(data, list) else [data]
                    result_entries = []
                    
                    # 处理每个条目
                    for entry in entries:
                        # 检查记账必要字段是否存在
                        if not entry.get("amount") or not entry.get("category"):
                            continue
                            
                        # 无论用户输入什么，始终使用当前时间
                        entry["datetime"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        
                        # 确保amount为数值并根据type调整正负
                        if entry.get("amount") is not None:
                            amount = float(entry["amount"])
                            if entry.get("type") == "income" and amount < 0:
                                amount = abs(amount)
                            elif entry.get("type") == "expense" and amount > 0:
                                amount = -amount
                            entry["amount"] = amount
                        
                        result_entries.append(entry)
                    
                    # 如果所有条目都无效，返回None
                    if not result_entries:
                        return None
                        
                    return result_entries
            return None
        except Exception as e:
            print(f"提取记账信息错误: {e}")
            return None
    
    def _check_sensitive_content(self, text):
        """检查是否有敏感内容"""
        # 构建用于识别敏感内容的提示词
        prompt = f"""
        请检查以下文本是否包含违反法律法规的内容，如赌博、毒品等。如果包含，请简单说明包含什么敏感内容；如果不包含，请只回复"无敏感内容"。

        文本: {text}
        """
        response = query_deepseek(prompt)
        if response and "无敏感内容" not in response:
            return True, response        
        return False, None

    def _generate_ai_response(self, extracted_info, action_taken=None):
        """生成AI回复"""
        if not action_taken:
            action_taken = "提取信息"
        
        prompt = f"""
        请针对以下记账操作生成一个友好的回复，回复要简洁、自然、亲切，根据记账性质(收入/支出)给予适当的评价或建议。
        
        记账信息: {json.dumps(extracted_info, ensure_ascii=False)}
        操作类型: {action_taken}
        
        回复要求：
        1. 确认记录的具体内容（金额、类别、具体名称）
        2. 如果有多条记录，简要总结这些记录的类型和总金额
        3. 如果是支出，可以基于金额大小和类别给出适当的省钱建议（但不要过度说教）
        4. 如果是收入，可以表示祝贺并鼓励
        5. 回复应该有温度，像朋友一样交流，使用适当的表情符号增加亲近感
        6. 总字数控制在100字以内
        7. 严禁在回复中出现任何关于字数计数、表情选择或其他元注释的内容
        8. 只输出最终回复内容，不要包含任何括号内的注释说明
        """
        
        response = query_deepseek(prompt)
        # 移除可能出现的元注释
        response = re.sub(r'（注：.*?）', '', response)
        response = re.sub(r'\(注：.*?\)', '', response)
        # 确保换行符被保留并正确处理
        response = response.replace('\n', '<br>')
        return response    
    def _generate_report_response(self, report_type, time_period):
        """生成报表分析回复"""
        # 根据报表类型和时间周期获取相应数据
        entries = self.data_store.get_entries()
        
        if not entries:
            return "目前没有任何记账数据，无法生成报表分析。请先添加一些记账数据吧！"
          # 获取当前日期信息，用于确定时间范围
        today = datetime.datetime.now()
        start_date = None
        end_date = today.strftime("%Y-%m-%d 23:59:59")
        
        # 根据时间周期确定查询的开始日期
        if time_period == "今天":
            start_date = today.strftime("%Y-%m-%d 00:00:00")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        elif time_period == "昨天":
            yesterday = today - datetime.timedelta(days=1)
            start_date = yesterday.strftime("%Y-%m-%d 00:00:00")
            end_date = yesterday.strftime("%Y-%m-%d 23:59:59")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        elif time_period == "本周":
            # 计算本周一的日期
            start_date = (today - datetime.timedelta(days=today.weekday())).strftime("%Y-%m-%d 00:00:00")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        elif time_period == "上周":
            # 计算上周一和上周日的日期
            last_week_start = today - datetime.timedelta(days=today.weekday() + 7)
            last_week_end = last_week_start + datetime.timedelta(days=6)
            start_date = last_week_start.strftime("%Y-%m-%d 00:00:00")
            end_date = last_week_end.strftime("%Y-%m-%d 23:59:59")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        elif time_period == "本月":
            # 计算本月初的日期
            start_date = today.strftime("%Y-%m-01 00:00:00")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        elif time_period == "上月":
            # 计算上月的起始和结束日期
            last_month = today.replace(day=1) - datetime.timedelta(days=1)
            start_date = last_month.replace(day=1).strftime("%Y-%m-%d 00:00:00")
            end_date = last_month.strftime("%Y-%m-%d 23:59:59")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        elif time_period == "今年":
            # 计算本年初的日期
            start_date = today.strftime("%Y-01-01 00:00:00")
            entries = self.data_store.get_entries(start_date=start_date, end_date=end_date)
        
        # 简单数据统计
        income_entries = [e for e in entries if float(e.get("amount", 0)) > 0]
        expense_entries = [e for e in entries if float(e.get("amount", 0)) < 0]
        
        total_income = sum(float(e.get("amount", 0)) for e in income_entries)
        total_expense = sum(abs(float(e.get("amount", 0))) for e in expense_entries)
        net_income = total_income - total_expense
        
        # 按类别统计支出
        expense_by_category = {}
        for entry in expense_entries:
            category = entry.get("category", "未分类")
            amount = abs(float(entry.get("amount", 0)))
            expense_by_category[category] = expense_by_category.get(category, 0) + amount
        
        # 按类别统计收入
        income_by_category = {}
        for entry in income_entries:
            category = entry.get("category", "未分类")
            amount = float(entry.get("amount", 0))
            income_by_category[category] = income_by_category.get(category, 0) + amount
        
        # 找出支出最高的类别
        top_expense_categories = sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # 找出收入最高的类别
        top_income_categories = sorted(income_by_category.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # 计算收支比例
        expense_ratio = 0
        if total_income > 0:
            expense_ratio = (total_expense / total_income) * 100
        
        # 准备类别占比数据
        expense_percentage = {}
        for cat, amount in expense_by_category.items():
            if total_expense > 0:
                expense_percentage[cat] = (amount / total_expense) * 100
          # 构造更加有趣、生活化的报表提示词
        prompt = f"""
        你是用户的好友，也是一个幽默风趣的"钱包管家"，请根据以下财务数据生成一份轻松有趣的{time_period}消费报告。报告应该像朋友间的闲聊，充满个性和乐趣。
        
        ## 基础统计数据
        统计周期: {time_period}
        统计开始日期: {start_date}
        统计结束日期: {end_date}
        总收入: {total_income:.2f}元
        总支出: {total_expense:.2f}元
        净收入: {net_income:.2f}元
        收支比: {expense_ratio:.1f}%

        ## 支出类别明细（从高到低）
        {', '.join([f"{cat}: {amount:.2f}元 ({expense_percentage.get(cat, 0):.1f}%)" for cat, amount in top_expense_categories])}
        
        ## 收入类别明细（从高到低）
        {', '.join([f"{cat}: {amount:.2f}元" for cat, amount in top_income_categories])}
        
        ## 消费时间分布
        最近的几笔消费: {", ".join([f"{e.get('specific_name', '未命名')}({abs(float(e.get('amount', 0))):.0f}元)" for e in expense_entries[:3]])}
        
        ## 报告要求:
        1. 以轻松幽默的语气，像朋友一样讨论用户的财务状况
        2. 使用生动有趣的表情符号和口语化表达
        3. 调侃用户的消费习惯，但要保持友善（例如："看来你最近又沉迷购物啦～"）
        4. 突出几笔有趣或值得注意的消费，并加以幽默评论
        5. 指出用户消费最多的项目和次数最多的项目，并给予风趣的"诊断"
        6. 如果可能，提到消费的时间模式（例如："你似乎特别喜欢半夜剁手？"）
        7. 给出1-2条实用但不说教的省钱建议，使用鼓励的语气
        8. 内容亲切友好，就像好友之间的日常对话
        9. 控制总字数在200-300字之间
        10. 根据总体财务状况，给予适当的鼓励或调侃
        
        请记住，这是一个日常化、轻松的报告，不是严肃的财务分析。使用对话式、幽默的语言，让用户感到亲切而不是被教育。
        """
        
        response = query_deepseek(prompt, temperature=0.7)
        # 移除可能出现的元注释
        response = re.sub(r'（注：.*?）', '', response)
        response = re.sub(r'\(注：.*?\)', '', response)
        # 确保换行符被保留并正确处理
        response = response.replace('\n', '<br>')
        return response
    def process_user_message(self, user_message):
        """处理用户消息并返回回复
        
        Args:
            user_message: 用户输入的消息文本
            
        Returns:
            回复文本或包含回复和记账数据的字典
        """
        # 检查敏感内容
        has_sensitive, sensitive_info = self._check_sensitive_content(user_message)
        if has_sensitive:
            return f"抱歉，您的消息可能包含不适当的内容: {sensitive_info}。请重新输入合规的内容。"
          # 判断是否是查询或报表请求
        if "报表" in user_message or "分析" in user_message or "统计" in user_message or "报告" in user_message:
            # 确定时间周期
            time_period = "本月"
            
            # 更详细地识别时间周期
            if "今天" in user_message or "当天" in user_message or "今日" in user_message:
                time_period = "今天"
            elif "昨天" in user_message or "昨日" in user_message:
                time_period = "昨天" 
            elif "本周" in user_message or "这周" in user_message or "这一周" in user_message:
                time_period = "本周"
            elif "上周" in user_message or "上一周" in user_message:
                time_period = "上周"
            elif "本月" in user_message or "这个月" in user_message or "这月" in user_message:
                time_period = "本月"
            elif "上月" in user_message or "上个月" in user_message:
                time_period = "上月"
            elif "本年" in user_message or "今年" in user_message or "这一年" in user_message:
                time_period = "今年"
            elif "年度" in user_message or "全年" in user_message:
                time_period = "今年"
            
            print(f"正在生成{time_period}财务报告...")    
            return self._generate_report_response(report_type="general", time_period=time_period)
          # 提取记账信息
        extracted_info = self._extract_accounting_info(user_message)
        if extracted_info:
            # 检查是否为多条记账条目
            if isinstance(extracted_info, list):
                # 添加多条记账条目
                success_count = 0
                for entry in extracted_info:
                    entry_id = self.data_store.add_entry(entry)
                    if entry_id:
                        success_count += 1
                
                if success_count > 0:                # 生成回复，告知用户已成功添加多条记账条目
                    ai_reply = self._generate_ai_response(extracted_info, action_taken=f"添加了{success_count}条记录")
                    
                    # 返回所有条目的结构化信息
                    ledger_entries = []
                    for entry in extracted_info:
                        ledger_entries.append({
                            "amount": entry.get("amount"),
                            "categoryTag": entry.get("category") or "其他",
                            "specificName": entry.get("specific_name") or "",
                            "time": entry.get("datetime")
                        })
                    
                    return {
                        "replyText": ai_reply,
                        "ledgerEntries": ledger_entries
                    }
                else:
                    return "很抱歉，记账时出现了问题。请稍后再试。"
            else:
                # 添加单条记账条目
                entry_id = self.data_store.add_entry(extracted_info)
                if entry_id:
                    ai_reply = self._generate_ai_response(extracted_info, action_taken="添加")
                    ledger_entry = {
                        "amount": extracted_info.get("amount"),
                        "categoryTag": extracted_info.get("category") or "其他",
                        "specificName": extracted_info.get("specific_name") or "",
                        "time": extracted_info.get("datetime")
                    }
                    return {
                        "replyText": ai_reply,
                        "ledgerEntry": ledger_entry
                    }
                else:
                    return "很抱歉，记账时出现了问题。请稍后再试。"
        else:            # 如果无法提取记账信息，直接切换到聊天模式
            prompt = f"""
            你是一个专业的个人记账助手，名叫"AI记账"。你现在正在与用户进行日常聊天。请对用户的问题做出自然、友好的回答。
            
            如果用户问你是谁，请介绍自己是AI记账助手，可以帮助用户记录日常收支。
            如果用户问你能做什么，请告诉他们你可以帮助记账、提供财务报表分析、提供理财建议等功能。
            
            用户的问题与记账无明显关联，所以不要强行将话题引回到记账，而是进行自然的对话交流。但在对话结束时，可以适当提示用户记账功能的存在。
            
            用户问题: {user_message}
            
            回答要求：
            1. 简洁明了，不超过100字
            2. 语气友好自然，像真人助手一样
            3. 不要提示"无法提取记账信息"或类似内容
            4. 如果是常规聊天，自然地回应，不要刻意引导记账
            5. 严禁在回复中包含任何关于字数计数、表情选择或其他元注释的内容
            6. 只输出最终回复内容，不要包含任何括号内的注释说明
            """
            
            response = query_deepseek(prompt)
            # 移除可能出现的元注释
            response = re.sub(r'（注：.*?）', '', response)
            response = re.sub(r'\(注：.*?\)', '', response)
            # 确保换行符被保留并正确处理
            response = response.replace('\n', '<br>')
            return response



