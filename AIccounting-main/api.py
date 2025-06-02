# -*- coding: utf-8 -*-
import datetime
import calendar
from collections import defaultdict
from flask import Flask, request, jsonify
from flask_cors import CORS
from sql import MySQLDataStore
from chat import AIAccountant

app = Flask(__name__)
CORS(app)

def _get_db():
    """实例化并返回一个 MySQLDataStore 对象。"""
    return MySQLDataStore()

def _parse_date_optional(date_str):
    """将日期字符串 (YYYY-MM-DD) 解析为日期对象。如果输入为 None，则返回 None。"""
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None

def _get_time_range_from_period(time_period_str, reference_date_str=None):
    today = datetime.date.today()
    if reference_date_str:
        try:
            today = _parse_date_optional(reference_date_str)
        except ValueError:
            pass

    start_date, end_date = None, None

    if not time_period_str:
        return None, None

    time_period_lower = str(time_period_str).lower()

    # 尝试解析具体日期
    try:
        dt = datetime.datetime.strptime(time_period_str, "%Y-%m-%d").date()
        return dt, dt
    except ValueError:
        pass
    
    try:
        dt = datetime.datetime.strptime(time_period_str, "%Y-%m").date()
        start_date = dt.replace(day=1)
        _, last_day_of_month = calendar.monthrange(dt.year, dt.month)
        end_date = dt.replace(day=last_day_of_month)
        return start_date, end_date
    except ValueError:
        pass

    if time_period_lower == "today":
        start_date = end_date = today
    elif time_period_lower == "this_week":
        start_date = today - datetime.timedelta(days=today.weekday())
        end_date = start_date + datetime.timedelta(days=6)
    elif time_period_lower == "this_month":
        start_date = today.replace(day=1)
        _, last_day_of_month = calendar.monthrange(today.year, today.month)
        end_date = today.replace(day=last_day_of_month)
    elif time_period_lower == "本月":
        start_date = today.replace(day=1)
        _, last_day_of_month = calendar.monthrange(today.year, today.month)
        end_date = today.replace(day=last_day_of_month)
    else:
        raise ValueError(f"不支持的时间周期字符串: {time_period_str}")
    
    if start_date and end_date:
        return start_date, end_date
    else:
        raise ValueError(f"不支持的时间周期字符串: {time_period_str}")

def get_filtered_transaction_list_api(
    start_date_str=None, end_date_str=None, 
    time_period=None, 
    income_expense_type=None,
    categories=None
):
    db = _get_db()
    
    s_date, e_date = None, None
    if time_period:
        s_date, e_date = _get_time_range_from_period(time_period)
    
    if start_date_str:
        s_date = _parse_date_optional(start_date_str)
    if end_date_str:
        e_date = _parse_date_optional(end_date_str)

    start_datetime_query_str, end_datetime_query_str = None, None
    if s_date:
        start_datetime_query_str = datetime.datetime.combine(s_date, datetime.time.min).strftime("%Y-%m-%d %H:%M:%S")
    if e_date:
        end_datetime_query_str = datetime.datetime.combine(e_date, datetime.time.max).strftime("%Y-%m-%d %H:%M:%S")

    entry_type_filter_param = None
    if income_expense_type and income_expense_type.lower() == "income":
        entry_type_filter_param = "income"
    elif income_expense_type and income_expense_type.lower() == "expense":
        entry_type_filter_param = "expense"

    include_income_param = entry_type_filter_param != "expense"
    include_expense_param = entry_type_filter_param != "income"

    entries = db.get_entries(
        start_date=start_datetime_query_str,
        end_date=end_datetime_query_str,
        categories=categories,
        include_income=include_income_param,
        include_expense=include_expense_param
    )
    return entries

def get_summary_statistics_api(
    start_date_str=None, end_date_str=None, 
    time_period=None, categories=None
):
    transactions = get_filtered_transaction_list_api(
        start_date_str=start_date_str, end_date_str=end_date_str,
        time_period=time_period, income_expense_type="all", categories=categories
    )
    total_income = 0.0
    total_expense = 0.0
    
    for t in transactions:
        amount = float(t['amount'])
        if t['type'] == 'income':
            total_income += abs(amount)
        elif t['type'] == 'expense':
            total_expense += abs(amount)

    net_income = total_income - total_expense
    total_flow = total_income + total_expense

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_income": round(net_income, 2),
        "total_flow": round(total_flow, 2)
    }

def get_time_series_data_api_with_date_range(
    time_unit,
    start_date_str,
    end_date_str,
    income_expense_focus="net_income",
    categories=None
):
    """
    根据指定的日期范围获取时间序列数据，用于处理自定义日期范围的趋势数据。
    """
    # 解析日期
    query_s_date = _parse_date_optional(start_date_str)
    query_e_date = _parse_date_optional(end_date_str)
    
    if not query_s_date or not query_e_date:
        raise ValueError(f"时间序列数据的日期范围无效: {start_date_str} 到 {end_date_str}")

    # 获取交易数据
    all_transactions = get_filtered_transaction_list_api(
        start_date_str=start_date_str, 
        end_date_str=end_date_str,
        income_expense_type="all",
        categories=categories
    )

    # 处理数据用于聚合
    processed_for_aggregation = []
    for t in all_transactions:
        current_amount = float(t['amount'])
        item_datetime_obj = t['datetime']
        
        # 处理datetime字符串格式
        if isinstance(item_datetime_obj, str):
            try:
                item_datetime_obj = datetime.datetime.strptime(item_datetime_obj, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                try:
                    item_datetime_obj = datetime.datetime.strptime(item_datetime_obj, "%Y-%m-%d")
                except ValueError:
                    continue
        
        value_to_aggregate = 0.0
        if income_expense_focus == "income":
            if t['type'] == 'income': 
                value_to_aggregate = abs(current_amount)
        elif income_expense_focus == "expense":
            if t['type'] == 'expense': 
                value_to_aggregate = abs(current_amount)  # 对于expense图表，显示正值
        elif income_expense_focus == "net_income":
            if t['type'] == 'income':
                value_to_aggregate = abs(current_amount)
            elif t['type'] == 'expense':
                value_to_aggregate = -abs(current_amount)  # 净收入中expense为负值
        elif income_expense_focus == "total_flow":
            value_to_aggregate = abs(current_amount)
        
        processed_for_aggregation.append({
            'datetime': item_datetime_obj,
            'value': value_to_aggregate
        })

    # 按时间单位分组数据
    grouped_data = defaultdict(float)
    result_series = []

    if time_unit == "day_of_month":
        for i in range(1, 32): 
            grouped_data[i] = 0.0
        
        for item in processed_for_aggregation:
            dt_obj = item['datetime']
            if isinstance(dt_obj, datetime.datetime):
                item_date = dt_obj.date()
            elif isinstance(dt_obj, datetime.date):
                item_date = dt_obj
            else:
                continue
                
            if query_s_date <= item_date <= query_e_date:
                day = dt_obj.day if isinstance(dt_obj, datetime.datetime) else item_date.day
                grouped_data[day] += item['value']
        
        result_series = [{"day": i, "value": round(grouped_data[i], 2)} for i in range(1, 32)]
        
    elif time_unit == "week" or time_unit == "day":
        # 创建从开始日期到结束日期每一天的日期键
        delta_days = (query_e_date - query_s_date).days
        for i in range(delta_days + 1):
            current_date = query_s_date + datetime.timedelta(days=i)
            date_key = current_date.strftime("%Y-%m-%d")
            grouped_data[date_key] = 0.0
        
        # 聚合交易到对应日期
        for item in processed_for_aggregation:
            dt_obj = item['datetime']
            if isinstance(dt_obj, datetime.datetime):
                item_date = dt_obj.date()
            elif isinstance(dt_obj, datetime.date):
                item_date = dt_obj
            else:
                continue
            
            if query_s_date <= item_date <= query_e_date:
                date_key = item_date.strftime("%Y-%m-%d")
                grouped_data[date_key] += item['value']
        
        # 构建结果
        result_series = [
            {"date": date_key, "value": round(value, 2)}
            for date_key, value in grouped_data.items()
        ]
        
    else:
        raise ValueError(f"不支持的时间单位: {time_unit}")
    
    return result_series

def get_category_distribution_api(
    time_period=None,
    income_expense_focus="expense",
    parent_categories=None,
    start_date_str=None,
    end_date_str=None
):
    """
    获取按类别分组的收支分布数据，用于饼图显示
    """
    # 获取筛选后的交易数据
    transactions = get_filtered_transaction_list_api(
        start_date_str=start_date_str,
        end_date_str=end_date_str,
        time_period=time_period,
        income_expense_type=income_expense_focus,
        categories=parent_categories
    )
    
    # 按类别分组统计
    category_totals = defaultdict(float)
    total_amount = 0.0
    
    for t in transactions:
        amount = abs(float(t['amount']))
        category = t['category']
        category_totals[category] += amount
        total_amount += amount
    
    # 转换为前端需要的格式
    result = []
    for category, amount in category_totals.items():
        result.append({
            "category": category,
            "value": round(amount, 2)
        })
    
    return result

def get_chart_data_from_filters(filters_dict):
    try:
        if not isinstance(filters_dict, dict):
            return {"error": "Invalid input: filters_dict must be a dictionary."}

        start_date_str_input = filters_dict.get('start_date')
        end_date_str_input = filters_dict.get('end_date')
        time_period_input = filters_dict.get('time_period', None)
        chart_type = filters_dict.get('chart_type', 'line')
        time_unit = filters_dict.get('time_unit', 'day_of_month')
        income_expense_focus = filters_dict.get('income_expense_focus', 'net_income')
        
        # 获取前端发送的类别筛选参数
        expense_categories = filters_dict.get('expense_categories', [])
        income_categories = filters_dict.get('income_categories', [])
        
        # 如果类别列表为空，则不筛选（显示所有类别）
        expense_filter = expense_categories if expense_categories else None
        income_filter = income_categories if income_categories else None
        
        # 合并所有筛选类别用于汇总统计和趋势数据
        all_filtered_categories = []
        if expense_filter:
            all_filtered_categories.extend(expense_filter)
        if income_filter:
            all_filtered_categories.extend(income_filter)
        combined_categories = all_filtered_categories if all_filtered_categories else None

        # 1. 汇总统计 - 使用筛选后的类别
        summary_stats = get_summary_statistics_api(
            start_date_str=start_date_str_input,
            end_date_str=end_date_str_input,
            time_period=time_period_input,
            categories=combined_categories
        )

        # 2. 分类分布 - 使用对应类型的筛选类别
        expense_category_distribution = get_category_distribution_api(
            start_date_str=start_date_str_input,
            end_date_str=end_date_str_input,
            time_period=time_period_input,
            income_expense_focus="expense",
            parent_categories=expense_filter
        )
        
        income_category_distribution = get_category_distribution_api(
            start_date_str=start_date_str_input,
            end_date_str=end_date_str_input,
            time_period=time_period_input,
            income_expense_focus="income",
            parent_categories=income_filter
        )        # 3. 趋势数据 - 分别获取收入和支出的时间序列
        if start_date_str_input and end_date_str_input:
            # 净收入趋势（原有的）
            daily_net_income_series = get_time_series_data_api_with_date_range(
                time_unit=time_unit,
                start_date_str=start_date_str_input,
                end_date_str=end_date_str_input,
                income_expense_focus="net_income",
                categories=combined_categories
            )
            
            # 收入趋势
            daily_income_series = get_time_series_data_api_with_date_range(
                time_unit=time_unit,
                start_date_str=start_date_str_input,
                end_date_str=end_date_str_input,
                income_expense_focus="income",
                categories=income_filter
            )
            
            # 支出趋势
            daily_expense_series = get_time_series_data_api_with_date_range(
                time_unit=time_unit,
                start_date_str=start_date_str_input,
                end_date_str=end_date_str_input,
                income_expense_focus="expense",
                categories=expense_filter
            )
        else:
            # 使用time_period，暂时返回空数据
            daily_net_income_series = []
            daily_income_series = []
            daily_expense_series = []

        # 4. 明细数据 - 使用对应类型的筛选类别        
        filtered_expense_transactions = get_filtered_transaction_list_api(
            start_date_str=start_date_str_input,
            end_date_str=end_date_str_input,
            time_period=time_period_input,
            income_expense_type="expense",
            categories=expense_filter
        )
        
        filtered_income_transactions = get_filtered_transaction_list_api(
            start_date_str=start_date_str_input,
            end_date_str=end_date_str_input,
            time_period=time_period_input,
            income_expense_type="income",
            categories=income_filter
        )        # 序列化datetime对象
        def serialize_transactions(transactions):
            serialized = []
            for t in transactions:
                t_copy = dict(t)
                if isinstance(t_copy.get('datetime'), (datetime.datetime, datetime.date)):
                    t_copy['datetime'] = t_copy['datetime'].isoformat()
                serialized.append(t_copy)
            return serialized

        return {
            "summary_statistics": summary_stats,
            "expense_category_distribution": expense_category_distribution,
            "income_category_distribution": income_category_distribution,
            "daily_net_income_series": daily_net_income_series,
            "daily_income_series": daily_income_series,
            "daily_expense_series": daily_expense_series,
            "filtered_expense_transactions": serialize_transactions(filtered_expense_transactions),
            "filtered_income_transactions": serialize_transactions(filtered_income_transactions)
        }

    except Exception as e:
        return {"error": str(e)}

# Flask 路由
@app.route('/get_transaction_list_for_frontend', methods=['GET'])
def get_transaction_list_for_frontend_route():
    try:
        transactions = get_filtered_transaction_list_api()
        summary = get_summary_statistics_api()
        
        # 序列化datetime对象
        serialized_transactions = []
        for t in transactions:
            t_copy = dict(t)
            if isinstance(t_copy.get('datetime'), (datetime.datetime, datetime.date)):
                t_copy['datetime'] = t_copy['datetime'].isoformat()
            serialized_transactions.append(t_copy)
        
        return jsonify({
            "summary": summary,
            "transactions": serialized_transactions
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_chart_data_from_filters', methods=['POST'])
def get_chart_data_from_filters_route():
    try:
        filters = request.get_json()
        result = get_chart_data_from_filters(filters)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/start', methods=['POST'])
def api_start():
    """AI助手启动检查端点"""
    try:
        # 简单健康检查，返回AI助手可用
        return jsonify({"success": True, "message": "AI助手已准备就绪"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def api_chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "消息内容不能为空"}), 400
        
        db_store = _get_db()
        ai_accountant = AIAccountant(data_store=db_store)
        
        # 处理用户消息，获得AI回复和记账结构
        ai_response = ai_accountant.process_user_message(message)
        
        # 兼容处理不同的返回格式
        if isinstance(ai_response, str):
            # 纯文本回复
            return jsonify({
                "replyText": ai_response
            })
        elif isinstance(ai_response, dict):
            # 包含记账信息的回复
            reply_text = ai_response.get('replyText', '')
            ledger_entry = ai_response.get('ledgerEntry')
            
            # 如果有记账信息，自动保存到数据库
            if ledger_entry and isinstance(ledger_entry, dict):
                try:
                    db_store.add_entry({
                        'amount': ledger_entry.get("amount"),
                        'category': ledger_entry.get("categoryTag") or "其他",
                        'specific_name': ledger_entry.get("specificName") or "",
                        'datetime': ledger_entry.get("time") or datetime.datetime.now()
                    })
                except Exception as e:
                    print(f"保存记账信息失败: {e}")
            
            return jsonify({
                "replyText": reply_text,
                "ledgerEntry": ledger_entry
            })
        else:
            return jsonify({
                "replyText": "处理消息时出现未知错误"
            })
            
    except Exception as e:
        print(f"API错误: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)