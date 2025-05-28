# filepath: d:\\新建文件夹 (4)\\AIccounting\\api.py
import datetime
from collections import defaultdict
import calendar
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# 直接导入sql和chat模块
from sql import MySQLDataStore
from chat import AIAccountant

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# --- ReportLab Font Configuration for Chinese ---
font_path_regular = "C:/Windows/Fonts/msyh.ttc"  # Microsoft YaHei Regular
font_path_bold = "C:/Windows/Fonts/msyhbd.ttc"  # Microsoft YaHei Bold

reportlab_chinese_font_name = "MSYH"
reportlab_chinese_bold_font_name = "MSYHB"

# Attempt to register regular font for ReportLab
try:
    pdfmetrics.registerFont(TTFont(reportlab_chinese_font_name, font_path_regular))
    print(f"成功注册常规中文字体 (ReportLab): '{reportlab_chinese_font_name}' from '{font_path_regular}'.")
except Exception as e:
    print(f"警告: 注册常规中文字体 (ReportLab) '{reportlab_chinese_font_name}' 从 '{font_path_regular}' 失败: {e}.")
    reportlab_chinese_font_name = None

# Attempt to register bold font for ReportLab
try:
    pdfmetrics.registerFont(TTFont(reportlab_chinese_bold_font_name, font_path_bold))
    print(f"成功注册粗体中文字体 (ReportLab): '{reportlab_chinese_bold_font_name}' from '{font_path_bold}'.")
except Exception as e:
    print(f"警告: 注册粗体中文字体 (ReportLab) '{reportlab_chinese_bold_font_name}' 从 '{font_path_bold}' 失败: {e}.")
    reportlab_chinese_bold_font_name = None

# --- 辅助函数 ---

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
        try:
            return datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S").date()
        except ValueError:
            raise ValueError("无效的日期格式。请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS。")

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
    try:
        dt = datetime.datetime.strptime(time_period_str, "%Y").date()
        start_date = dt.replace(month=1, day=1)
        end_date = dt.replace(month=12, day=31)
        return start_date, end_date
    except ValueError:
        pass

    if time_period_lower == "today":
        start_date = end_date = today
    elif time_period_lower == "yesterday":
        start_date = end_date = today - datetime.timedelta(days=1)
    elif time_period_lower == "this_week":
        start_date = today - datetime.timedelta(days=today.weekday())
        end_date = start_date + datetime.timedelta(days=6)
    elif time_period_lower == "last_week":
        end_of_last_week = today - datetime.timedelta(days=today.weekday() + 1)
        start_date = end_of_last_week - datetime.timedelta(days=6)
        end_date = end_of_last_week
    elif time_period_lower == "this_month":
        start_date = today.replace(day=1)
        _, last_day_of_month = calendar.monthrange(today.year, today.month)
        end_date = today.replace(day=last_day_of_month)
    elif time_period_lower == "last_month":
        first_day_current_month = today.replace(day=1)
        end_date = first_day_current_month - datetime.timedelta(days=1)
        start_date = end_date.replace(day=1)
    elif time_period_lower == "this_year":
        start_date = today.replace(month=1, day=1)
        end_date = today.replace(month=12, day=31)
    elif time_period_lower == "last_year":
        last_year_num = today.year - 1
        start_date = datetime.date(last_year_num, 1, 1)
        end_date = datetime.date(last_year_num, 12, 31)
    
    if start_date and end_date:
        return start_date, end_date
    else:
        raise ValueError(f"不支持的时间周期字符串: {time_period_str}")

# --- API 函数 ---

def get_transaction_details_api(entry_id):
    db = _get_db()
    all_entries = db.get_entries() 
    for entry in all_entries:
        if entry['id'] == entry_id:
            return entry
    return None

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
    
    include_income_param = True
    include_expense_param = True
    if entry_type_filter_param == "income":
        include_expense_param = False
    elif entry_type_filter_param == "expense":
        include_income_param = False
        
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
            total_income += amount
        elif t['type'] == 'expense':
            total_expense += amount
            
    net_income = total_income - total_expense
    total_flow = total_income + total_expense

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_income": round(net_income, 2),
        "total_flow": round(total_flow, 2)
    }

def get_time_series_data_api(
    time_unit,
    time_period,
    income_expense_focus="net_income",
    categories=None
):
    query_s_date, query_e_date = _get_time_range_from_period(time_period)
    if not query_s_date or not query_e_date:
        raise ValueError(f"时间序列数据的 time_period 无效: {time_period}")

    all_transactions = get_filtered_transaction_list_api(
        start_date_str=query_s_date.strftime("%Y-%m-%d"), 
        end_date_str=query_e_date.strftime("%Y-%m-%d"),
        income_expense_type="all",
        categories=categories
    )

    processed_for_aggregation = []
    for t in all_transactions:
        current_amount = float(t['amount'])
        item_datetime_obj = t['datetime']
        
        value_to_aggregate = 0.0
        if income_expense_focus == "income":
            if t['type'] == 'income': 
                value_to_aggregate = current_amount
        elif income_expense_focus == "expense":
            if t['type'] == 'expense': 
                value_to_aggregate = current_amount
        elif income_expense_focus == "net_income":
            if t['type'] == 'income':
                value_to_aggregate = current_amount
            elif t['type'] == 'expense':
                value_to_aggregate = -current_amount
        elif income_expense_focus == "total_flow":
            value_to_aggregate = current_amount
        else:
            raise ValueError(f"无效的 income_expense_focus: {income_expense_focus}")
            
        if value_to_aggregate != 0.0 or income_expense_focus in ["net_income", "total_flow"]:
             processed_for_aggregation.append({'datetime': item_datetime_obj, 'value': value_to_aggregate})

    grouped_data = defaultdict(float)
    result_series = []

    if time_unit == "hour_of_day":
        if query_s_date != query_e_date:
            raise ValueError("对于 'hour_of_day'，time_period 必须解析为单日。")
        target_day = query_s_date
        for i in range(24): grouped_data[i] = 0.0
        for item in processed_for_aggregation:
            if item['datetime'].date() == target_day:
                grouped_data[item['datetime'].hour] += item['value']
        result_series = [{"hour": h, "value": round(grouped_data[h],2)} for h in range(24)]

    elif time_unit == "day_of_week":
        days_of_week_map = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        for day_name_cn in days_of_week_map: grouped_data[day_name_cn] = 0.0
        for item in processed_for_aggregation:
            if query_s_date <= item['datetime'].date() <= query_e_date:
                day_name_cn = days_of_week_map[item['datetime'].weekday()]
                grouped_data[day_name_cn] += item['value']
        result_series = [{"day_of_week": day_name_cn, "value": round(grouped_data[day_name_cn],2)} for day_name_cn in days_of_week_map]
        
    elif time_unit == "month_of_year":
        chinese_months_map = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
        for month_name_cn in chinese_months_map: grouped_data[month_name_cn] = 0.0
        for item in processed_for_aggregation:
            if query_s_date <= item['datetime'].date() <= query_e_date:
                month_index = item['datetime'].month -1
                month_name_cn = chinese_months_map[month_index]
                grouped_data[month_name_cn] += item['value']
        result_series = [{"month_of_year": month_name_cn, "value": round(grouped_data[month_name_cn],2)} for month_name_cn in chinese_months_map]
    elif time_unit == "day_of_month":
        for i in range(1, 32): grouped_data[i] = 0.0
        for item in processed_for_aggregation:
            if query_s_date <= item['datetime'].date() <= query_e_date:
                day = item['datetime'].day
                grouped_data[day] += item['value']
        result_series = [{"day": i, "value": round(grouped_data[i],2)} for i in range(1, 32)]
    else:
        raise ValueError(f"不支持的时间单位: {time_unit}")
    
    return result_series

def get_category_distribution_api(
    time_period,
    income_expense_focus,
    parent_categories=None 
):
    if not time_period:
        time_period = "this_week"  # 默认按本周
    db = _get_db()
    s_date, e_date = _get_time_range_from_period(time_period)
    if not s_date or not e_date:
        raise ValueError(f"类别分布的 time_period 无效: {time_period}")

    start_dt_str = datetime.datetime.combine(s_date, datetime.time.min).strftime("%Y-%m-%d %H:%M:%S")
    end_dt_str = datetime.datetime.combine(e_date, datetime.time.max).strftime("%Y-%m-%d %H:%M:%S")

    category_summary = defaultdict(float)

    if income_expense_focus.lower() == "expense":
        stats_list = db.get_category_stats(start_date=start_dt_str, end_date=end_dt_str)
        for item in stats_list:
            category = item["category"]
            total_amount = item["amount"]
            if not parent_categories or category in parent_categories:
                category_summary[category] = total_amount
    elif income_expense_focus.lower() == "income":
        entries = db.get_entries(start_date=start_dt_str, end_date=end_dt_str, include_income=True, include_expense=False)
        for entry in entries:
            category = entry["category"]
            amount = entry["amount"]
            if not parent_categories or category in parent_categories:
                category_summary[category] += amount
    else:
        raise ValueError("类别分布的 income_expense_focus 必须是 'income' 或 'expense'。")

    return [{"category": cat, "value": round(val,2)} for cat, val in category_summary.items()]

def get_visualization_data_api(
    chart_type,
    time_period,
    time_unit=None,
    group_by_category=False, 
    income_expense_focus="net_income",
    categories_filter=None
):
    if chart_type.lower() in ["bar", "line"]:
        if group_by_category:
            if income_expense_focus.lower() not in ["income", "expense"]:
                raise ValueError("对于按类别分组的条形图/折线图，income_expense_focus 必须是 'income' 或 'expense'。")
            return get_category_distribution_api(
                time_period=time_period,
                income_expense_focus=income_expense_focus,
                parent_categories=categories_filter
            )
        elif time_unit:
            return get_time_series_data_api(
                time_unit=time_unit,
                time_period=time_period,
                income_expense_focus=income_expense_focus,
                categories=categories_filter 
            )
        else:
            raise ValueError("对于条形图/折线图，请指定 'time_unit' (用于时间序列) 或设置 'group_by_category=True'。")

    elif chart_type.lower() == "pie":
        if income_expense_focus.lower() not in ["income", "expense"]:
            raise ValueError("对于饼图，income_expense_focus 必须是 'income' 或 'expense'。")
        return get_category_distribution_api(
            time_period=time_period,
            income_expense_focus=income_expense_focus,
            parent_categories=categories_filter
        )
    else:
        raise ValueError(f"不支持的图表类型: {chart_type}")

def generate_financial_report_api(time_period, report_title_prefix="财务报告"):
    report_data = {}

    db_store = _get_db()
    ai_accountant = AIAccountant(data_store=db_store)

    s_date, e_date = _get_time_range_from_period(time_period)
    if not s_date or not e_date:
        raise ValueError(f"无法为报告确定有效的时间范围: {time_period}")

    readable_time_period_for_ai = f"{s_date.strftime('%Y年%m月%d日')} 至 {e_date.strftime('%Y年%m月%d日')}"
    if s_date == e_date:
        readable_time_period_for_ai = s_date.strftime('%Y年%m月%d日')

    readable_time_period = f"{s_date.strftime('%Y年%m月%d日')} - {e_date.strftime('%Y年%m月%d日')}"
    if s_date == e_date:
        readable_time_period = s_date.strftime('%Y年%m月%d日')

    report_data["report_title"] = f"{report_title_prefix} ({time_period.capitalize()})"
    report_data["time_period_readable"] = readable_time_period

    summary_stats = get_summary_statistics_api(time_period=time_period)
    report_data["summary_statistics"] = summary_stats
    report_data["summary_statistics_title"] = "核心指标汇总"

    expense_category_details_for_ai = get_category_distribution_api(time_period=time_period, income_expense_focus="expense")
    income_category_details_for_ai = get_category_distribution_api(time_period=time_period, income_expense_focus="income")
    
    top_expense_transactions_for_ai = get_filtered_transaction_list_api(time_period=time_period, income_expense_type="expense")
    top_expense_transactions_for_ai = sorted(top_expense_transactions_for_ai, key=lambda x: x['amount'], reverse=True)[:5]

    top_income_transactions_for_ai = get_filtered_transaction_list_api(time_period=time_period, income_expense_type="income")
    top_income_transactions_for_ai = sorted(top_income_transactions_for_ai, key=lambda x: x['amount'], reverse=True)[:5]

    ai_analysis_text = ai_accountant.generate_ai_financial_analysis(
        summary_stats=summary_stats,
        expense_category_details=expense_category_details_for_ai,
        income_category_details=income_category_details_for_ai,
        top_expenses=top_expense_transactions_for_ai,
        top_incomes=top_income_transactions_for_ai,
        time_period_readable=readable_time_period_for_ai
    )
    report_data["ai_analysis"] = {
        "title": "AI 财务分析与建议",
        "text": ai_analysis_text if ai_analysis_text else "AI财务分析暂时无法生成。"
    }

    expense_category_data = get_visualization_data_api(chart_type="pie", time_period=time_period, income_expense_focus="expense")
    report_data["expense_distribution"] = {
        "title": "支出类别分布",
        "chart_type": "pie",
        "data": expense_category_data if expense_category_data else []
    }

    income_category_data = get_visualization_data_api(chart_type="pie", time_period=time_period, income_expense_focus="income")
    report_data["income_distribution"] = {
        "title": "收入类别分布",
        "chart_type": "pie",
        "data": income_category_data if income_category_data else []
    }
    
    report_data["net_income_trend"] = None 
    trend_title = None
    trend_data = None
    trend_time_unit = None

    is_this_month_or_equivalent = time_period.lower() == "this_month" or \
                                (s_date.year == e_date.year and s_date.month == e_date.month and (e_date - s_date).days < 32)
    is_this_year_or_equivalent = time_period.lower() == "this_year" or \
                               (s_date.year == e_date.year and s_date.month == 1 and s_date.day == 1 and e_date.month == 12 and e_date.day == 31)

    if is_this_month_or_equivalent:
        if time_period.lower() == "this_week":
            trend_title = "本周每日净收入趋势"
            trend_time_unit = "day_of_week"
            trend_data = get_visualization_data_api(chart_type="bar", time_period=time_period, time_unit=trend_time_unit, income_expense_focus="net_income")
    elif is_this_year_or_equivalent:
        trend_title = "本年每月净收入趋势"
        trend_time_unit = "month_of_year"
        trend_data = get_visualization_data_api(chart_type="bar", time_period=time_period, time_unit=trend_time_unit, income_expense_focus="net_income")

    if trend_title: 
        report_data["net_income_trend"] = {
            "title": trend_title,
            "chart_type": "bar",
            "time_unit": trend_time_unit,
            "data": trend_data if trend_data else []
        }

    expense_transactions_raw = get_filtered_transaction_list_api(time_period=time_period, income_expense_type="expense")
    expense_details_data = []
    if expense_transactions_raw:
        sorted_transactions = sorted(expense_transactions_raw, key=lambda x: x['datetime'], reverse=True)[:10]
        for t in sorted_transactions:
            dt_val = t['datetime']
            dt_str = ""
            if isinstance(dt_val, (datetime.datetime, datetime.date)):
                dt_str = dt_val.isoformat()
            else:
                dt_str = str(dt_val)

            expense_details_data.append({
                "datetime": dt_str,
                "category": t['category'],
                "specific_name": t.get('specific_name', ''),
                "amount": t['amount']
            })
    
    report_data["expense_details"] = {
        "title": "近期主要支出明细 (最多10条)",
        "transactions": expense_details_data
    }

    return report_data

def get_chart_data_from_filters(filters_dict):
    try:
        if not isinstance(filters_dict, dict):
            return {"error": "Invalid input: filters_dict must be a dictionary."}

        income_categories_filter = filters_dict.get('income_categories', [])
        expense_categories_filter = filters_dict.get('expense_categories', [])
        start_date_str_input = filters_dict.get('start_date')
        end_date_str_input = filters_dict.get('end_date')
        time_period_input = filters_dict.get('time_period', None)

        if not isinstance(income_categories_filter, list):
            return {"error": "Invalid input: 'income_categories' must be a list."}
        if not isinstance(expense_categories_filter, list):
            return {"error": "Invalid input: 'expense_categories' must be a list."}

        # 组装时间范围优先级：start_date+end_date > time_period > 默认本周
        if start_date_str_input and end_date_str_input:
            # 用自定义日期范围，组装成YYYY-MM-DD~YYYY-MM-DD格式
            time_period_for_category = None
            # 直接传递给get_category_distribution_api的start_date和end_date
            s_date = _parse_date_optional(start_date_str_input)
            e_date = _parse_date_optional(end_date_str_input)
            start_dt_str = datetime.datetime.combine(s_date, datetime.time.min).strftime("%Y-%m-%d %H:%M:%S") if s_date else None
            end_dt_str = datetime.datetime.combine(e_date, datetime.time.max).strftime("%Y-%m-%d %H:%M:%S") if e_date else None
        else:
            # 用time_period
            time_period_for_category = time_period_input or "this_week"
            start_dt_str = None
            end_dt_str = None

        # 1. 汇总统计（按类别筛选）
        summary_stats = get_summary_statistics_api(
            start_date_str=start_date_str_input,
            end_date_str=end_date_str_input,
            time_period=time_period_input,
            categories=income_categories_filter + expense_categories_filter if (income_categories_filter or expense_categories_filter) else None
        )

        # 2. 分类分布
        if start_dt_str and end_dt_str:
            income_category_distribution = get_category_distribution_api(
                time_period=None,
                income_expense_focus="income",
                parent_categories=income_categories_filter if income_categories_filter else None
            )
            expense_category_distribution = get_category_distribution_api(
                time_period=None,
                income_expense_focus="expense",
                parent_categories=expense_categories_filter if expense_categories_filter else None
            )
            # 直接在api.py内部临时覆盖时间范围
            # 由于get_category_distribution_api只支持time_period参数，需临时patch
            # 这里直接用get_entries筛选并分组
            db = _get_db()
            # 收入
            income_entries = db.get_entries(start_date=start_dt_str, end_date=end_dt_str, include_income=True, include_expense=False)
            income_summary = defaultdict(float)
            for entry in income_entries:
                cat = entry["category"]
                if not income_categories_filter or cat in income_categories_filter:
                    income_summary[cat] += entry["amount"]
            income_category_distribution = [{"category": cat, "value": round(val,2)} for cat, val in income_summary.items()]
            # 支出
            expense_entries = db.get_entries(start_date=start_dt_str, end_date=end_dt_str, include_income=False, include_expense=True)
            expense_summary = defaultdict(float)
            for entry in expense_entries:
                cat = entry["category"]
                if not expense_categories_filter or cat in expense_categories_filter:
                    expense_summary[cat] += abs(entry["amount"])
            expense_category_distribution = [{"category": cat, "value": round(val,2)} for cat, val in expense_summary.items()]
        else:
            income_category_distribution = get_category_distribution_api(
                time_period=time_period_for_category,
                income_expense_focus="income",
                parent_categories=income_categories_filter if income_categories_filter else None
            )
            expense_category_distribution = get_category_distribution_api(
                time_period=time_period_for_category,
                income_expense_focus="expense",
                parent_categories=expense_categories_filter if expense_categories_filter else None
            )
        
        # 3. 趋势数据（按类别筛选）
        # 恢复为上一个版本：只根据跨度设置 time_unit，time_period_for_series 直接用 start_date_str_input
        if start_date_str_input and end_date_str_input:
            s_date = _parse_date_optional(start_date_str_input)
            e_date = _parse_date_optional(end_date_str_input)
            days_span = (e_date - s_date).days if (s_date and e_date) else 0
            if days_span >= 365:
                time_unit = "month_of_year"
            elif days_span >= 28:
                time_unit = "day_of_month"
            else:
                time_unit = "day_of_week"
            time_period_for_series = start_date_str_input
        else:
            time_period_for_series = time_period_input or "this_week"
            if time_period_for_series == "this_year" or time_period_for_series == "last_year":
                time_unit = "month_of_year"
            elif time_period_for_series == "this_month" or time_period_for_series == "last_month":
                time_unit = "day_of_month"
            else:
                time_unit = "day_of_week"
        daily_net_income_series = get_time_series_data_api(
            time_unit=time_unit,
            time_period=time_period_for_series,
            income_expense_focus="net_income",
            categories=income_categories_filter + expense_categories_filter if (income_categories_filter or expense_categories_filter) else None
        )
        
        # 4. 明细数据（已实现）
        current_data_store = _get_db()
        query_start_date_str, query_end_date_str = None, None
        s_date_obj, e_date_obj = None, None
        if start_date_str_input:
            s_date_obj = _parse_date_optional(start_date_str_input)
            if s_date_obj:
                query_start_date_str = datetime.datetime.combine(s_date_obj, datetime.time.min).strftime("%Y-%m-%d %H:%M:%S")
        if end_date_str_input:
            e_date_obj = _parse_date_optional(end_date_str_input)
            if e_date_obj:
                query_end_date_str = datetime.datetime.combine(e_date_obj, datetime.time.max).strftime("%Y-%m-%d %H:%M:%S")
        filtered_income_data_results = []
        if income_categories_filter:
            filtered_income_data_results = current_data_store.get_entries(
                start_date=query_start_date_str,
                end_date=query_end_date_str,
                categories=income_categories_filter,
                include_income=True,
                include_expense=False
            )
        filtered_expense_data_results = []
        if expense_categories_filter:
            filtered_expense_data_results = current_data_store.get_entries(
                start_date=query_start_date_str,
                end_date=query_end_date_str,
                categories=expense_categories_filter,
                include_income=False,
                include_expense=True
            )
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
            "income_category_distribution": income_category_distribution,
            "expense_category_distribution": expense_category_distribution,
            "daily_net_income_series": daily_net_income_series,
            "filtered_income_transactions": serialize_transactions(filtered_income_data_results),
            "filtered_expense_transactions": serialize_transactions(filtered_expense_data_results),
        }
    except ValueError as ve:
        print(f"ValueError in get_chart_data_from_filters: {ve}")
        return {"error": str(ve)}
    except Exception as e:
        print(f"Unexpected error in get_chart_data_from_filters: {e}")
        return {"error": "An internal server error occurred while fetching comprehensive chart data."}

def get_filtered_transactions_api(filters_dict):
    """
    专门用于前端筛选请求的API函数
    
    Args:
        filters_dict (dict): 筛选条件字典，包含：
            - income_categories (list, optional): 收入类别列表，如 ["工资", "奖金"]
            - expense_categories (list, optional): 支出类别列表，如 ["餐饮", "交通"]  
            - start_date (str, optional): 开始日期，格式 "YYYY-MM-DD"
            - end_date (str, optional): 结束日期，格式 "YYYY-MM-DD"
    
    Returns:
        dict: 包含 income_data 和 expense_data 的字典
    """
    try:
        if not isinstance(filters_dict, dict):
            return {"error": "Invalid input: filters_dict must be a dictionary."}

        income_categories = filters_dict.get('income_categories', [])
        expense_categories = filters_dict.get('expense_categories', [])
        start_date = filters_dict.get('start_date')
        end_date = filters_dict.get('end_date')

        # 验证输入类型
        if not isinstance(income_categories, list):
            return {"error": "Invalid input: 'income_categories' must be a list."}
        if not isinstance(expense_categories, list):
            return {"error": "Invalid input: 'expense_categories' must be a list."}

        # 获取收入数据
        income_data = []
        if income_categories:  # 只有当指定了收入类别时才查询
            income_data = get_filtered_transaction_list_api(
                start_date_str=start_date,
                end_date_str=end_date,
                income_expense_type="income",
                categories=income_categories
            )

        # 获取支出数据
        expense_data = []
        if expense_categories:  # 只有当指定了支出类别时才查询
            expense_data = get_filtered_transaction_list_api(
                start_date_str=start_date,
                end_date_str=end_date,
                income_expense_type="expense",
                categories=expense_categories
            )

        return {
            "income_data": income_data,
            "expense_data": expense_data
        }

    except Exception as e:
        print(f"Error in get_filtered_transactions_api: {e}")
        return {"error": f"An error occurred while fetching filtered transactions: {str(e)}"}

def get_transaction_records_api(filters_dict=None):
    """
    获取记账记录及明细的API函数
    
    Args:
        filters_dict (dict, optional): 筛选条件字典
    
    Returns:
        dict: 包含所有交易记录的字典
    """
    try:
        if filters_dict is None:
            filters_dict = {}

        start_date = filters_dict.get('start_date')
        end_date = filters_dict.get('end_date')
        categories = filters_dict.get('categories')  # 可以是收入或支出类别的混合列表

        # 获取所有交易记录
        all_transactions = get_filtered_transaction_list_api(
            start_date_str=start_date,
            end_date_str=end_date,
            income_expense_type="all",  # 获取所有类型
            categories=categories
        )

        # 按类型分组
        income_records = [t for t in all_transactions if t['type'] == 'income']
        expense_records = [t for t in all_transactions if t['type'] == 'expense']

        # 计算汇总统计
        total_income = sum(float(t['amount']) for t in income_records)
        total_expense = sum(abs(float(t['amount'])) for t in expense_records)  # 使用绝对值
        net_income = total_income - total_expense

        return {
            "summary": {
                "total_income": round(total_income, 2),
                "total_expense": round(total_expense, 2),
                "net_income": round(net_income, 2),
                "total_transactions": len(all_transactions)
            },
            "income_records": income_records,
            "expense_records": expense_records,
            "all_records": all_transactions
        }

    except Exception as e:
        print(f"Error in get_transaction_records_api: {e}")
        return {"error": f"An error occurred while fetching transaction records: {str(e)}"}

def get_transaction_list_for_frontend(filters_dict=None):
    """
    专门为前端设计的简化接口
    返回所有带有时间、类别、金额的交易记录
    
    Args:
        filters_dict (dict, optional): 筛选条件
            - categories (list): 类别筛选 ["餐饮", "交通"]
            - start_date (str): 开始日期 "2025-05-01"  
            - end_date (str): 结束日期 "2025-05-31"
            - transaction_type (str): "income", "expense", "all"
    
    Returns:
        dict: {
            "transactions": [...],  // 交易记录列表
            "summary": {...}        // 汇总信息
        }
    """
    try:
        if filters_dict is None:
            filters_dict = {}
            
        categories = filters_dict.get('categories', [])
        start_date = filters_dict.get('start_date')
        end_date = filters_dict.get('end_date') 
        transaction_type = filters_dict.get('transaction_type', 'all')
        
        # 获取筛选后的交易记录
        transactions = get_filtered_transaction_list_api(
            start_date_str=start_date,
            end_date_str=end_date,
            income_expense_type=transaction_type,
            categories=categories
        )
        
        # 为前端格式化数据
        formatted_transactions = []
        for t in transactions:
            formatted_transactions.append({
                "id": t['id'],
                "amount": abs(float(t['amount'])) if t['type'] == 'expense' else float(t['amount']),  # 前端显示正数
                "original_amount": float(t['amount']),  # 保留原始金额
                "category": t['category'],
                "specific_name": t.get('specific_name', ''),
                "date": t['datetime'].split(' ')[0],  # 只返回日期部分
                "datetime": t['datetime'],  # 完整时间
                "type": t['type']
            })
        
        # 计算汇总
        total_income = sum(t['original_amount'] for t in formatted_transactions if t['type'] == 'income')
        total_expense = sum(abs(t['original_amount']) for t in formatted_transactions if t['type'] == 'expense')
        
        return {
            "transactions": formatted_transactions,
            "summary": {
                "total_income": round(total_income, 2),
                "total_expense": round(total_expense, 2),
                "net_income": round(total_income - total_expense, 2),
                "count": len(formatted_transactions)
            }
        }
        
    except Exception as e:
        print(f"Error in get_transaction_list_for_frontend: {e}")
        return {"error": f"Failed to get transaction list: {str(e)}"}

# 注册字体
try:
    pdfmetrics.registerFont(TTFont('MSYH', 'C:/Windows/Fonts/msyh.ttc'))
    print("成功注册常规中文字体 (ReportLab): 'MSYH' from 'C:/Windows/Fonts/msyh.ttc'.")
except Exception as e:
    print(f"注册字体失败: {e}")

# 注释掉测试代码
"""
print("\n--- 测试 AIccounting API (Pure Python) ---")
# 测试 get_transaction_details_api
print("\n--- 测试 get_transaction_details_api (entry_id=1) ---")
details = get_transaction_details_api(1)
print(json.dumps(details, ensure_ascii=False, indent=2))

# 测试 get_chart_data_from_filters
print("\n--- 测试 get_chart_data_from_filters (增强版) ---")
print("重要提示: 以下测试的准确性依赖于数据库中的预设数据。")
print("数据库实际内容:")
db = _get_db()
entries = db.get_entries()
for entry in entries:
    print(f"{entry['id']}. id={entry['id']}, amount={entry['amount']}, category='{entry['category']}', datetime='{entry['datetime']}', type='{entry['type']}'")

# 测试1: 特定日期和类别
print("\n--- 测试 get_chart_data_from_filters (详细测试1: 特定日期 2025-05-21 和类别) ---")
chart_data_detailed_1 = get_chart_data_from_filters(
    start_date_str="2025-05-21",
    end_date_str="2025-05-21",
    categories=["餐饮", "交通", "兼职"],
    include_income=True,
    include_expense=True
)
print(json.dumps(chart_data_detailed_1, ensure_ascii=False, indent=2))

# 预期结果
expected_summary_1 = {
    "total_income": 200.0,
    "total_expense": 140.0,
    "net_income": 60.0,
    "total_transactions": 4
}

# 断言测试
assert chart_data_detailed_1["summary_statistics"] == expected_summary_1, \
    f"汇总统计不匹配 (测试1):\n实际: {chart_data_detailed_1['summary_statistics']}\n期望: {expected_summary_1}"

# 测试2: 特定类别
print("\n--- 测试 get_chart_data_from_filters (详细测试2: 特定类别) ---")
chart_data_detailed_2 = get_chart_data_from_filters(
    start_date_str="2025-05-20",
    end_date_str="2025-05-21",
    categories=["餐饮"],
    include_income=True,
    include_expense=True
)
print(json.dumps(chart_data_detailed_2, ensure_ascii=False, indent=2))

# 预期结果
expected_summary_2 = {
    "total_income": 0.0,
    "total_expense": 110.0,
    "net_income": -110.0,
    "total_transactions": 2
}

# 断言测试
assert chart_data_detailed_2["summary_statistics"] == expected_summary_2, \
    f"汇总统计不匹配 (测试2):\n实际: {chart_data_detailed_2['summary_statistics']}\n期望: {expected_summary_2}"

print("\n所有测试通过！")
"""

app = Flask(__name__)
CORS(app, supports_credentials=True)

# 添加接口路由
@app.route('/get_transaction_list_for_frontend', methods=['GET'])
def get_transaction_list_for_frontend_route():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    transaction_type = request.args.get('transaction_type', 'all')
    # 调用原有的业务逻辑函数
    result = get_transaction_list_for_frontend({
        'start_date': start_date,
        'end_date': end_date,
        'transaction_type': transaction_type
    })
    return jsonify(result)

@app.route('/api/start', methods=['POST'])
def api_start():
    # 简单健康检查，返回AI助手可用
    return jsonify({"success": True, "message": "AI助手已准备就绪"})

@app.route('/api/chat', methods=['POST'])
def api_chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({"error": "消息内容不能为空"}), 400
        
        # 初始化AI助手和数据库
        db = MySQLDataStore()
        ai = AIAccountant(db)
        
        # 处理用户消息，获得AI回复和记账结构
        ai_response = ai.process_user_message(user_message)
        # 期望ai_response为字符串或dict，需兼容处理
        reply_text = ai_response if isinstance(ai_response, str) else ai_response.get('replyText', '')
        ledger_entry = ai_response.get('ledgerEntry') if isinstance(ai_response, dict) else None
        
        # 如果AI解析出记账信息，自动写入数据库
        mapped_ledger_entry = None
        if ledger_entry and isinstance(ledger_entry, dict):
            mapped_ledger_entry = {
                "amount": ledger_entry.get("amount"),
                "categoryTag": ledger_entry.get("categoryTag") or ledger_entry.get("category") or "其他",
                "specificName": ledger_entry.get("specificName") or ledger_entry.get("specific_name") or "",
                "time": ledger_entry.get("time") or ledger_entry.get("datetime")
            }
            db.add_entry({
                'amount': mapped_ledger_entry["amount"],
                'category': mapped_ledger_entry["categoryTag"],
                'specific_name': mapped_ledger_entry["specificName"],
                'datetime': mapped_ledger_entry["time"],
                'entry_type': 'income' if float(mapped_ledger_entry["amount"] or 0) > 0 else 'expense'
            })
        
        return jsonify({
            "replyText": reply_text,
            "ledgerEntry": mapped_ledger_entry
        })
    except Exception as e:
        print(f"AI助手接口异常: {e}")
        return jsonify({"error": f"AI助手服务异常: {str(e)}"}), 500

@app.route('/get_chart_data_from_filters', methods=['POST'])
def get_chart_data_from_filters_route():
    try:
        filters = request.get_json()
        result = get_chart_data_from_filters(filters)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
