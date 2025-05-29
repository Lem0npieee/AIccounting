/**
 * API服务类
 * 将Python的API.py转换为JavaScript服务
 */
import SQLiteDataStore from './SQLiteDataStore';
import AIAccountant from './AIAccountant';

// 数据库实例
let dbInstance = null;
// AI记账助手实例
let aiAccountant = null;

/**
 * 获取数据库实例
 * @returns {SQLiteDataStore} 数据库实例
 */
function getDb() {
  if (!dbInstance) {
    dbInstance = new SQLiteDataStore();
    dbInstance.initializeDb(); // 初始化数据库
  }
  return dbInstance;
}

/**
 * 获取AI记账助手实例
 * @returns {AIAccountant} AI记账助手实例
 */
function getAiAccountant() {
  if (!aiAccountant) {
    aiAccountant = new AIAccountant(getDb());
  }
  return aiAccountant;
}

/**
 * 解析可选的日期字符串
 * @param {string} dateStr 日期字符串 YYYY-MM-DD
 * @returns {Date|null} 日期对象或null
 */
function parseDateOptional(dateStr) {
  if (!dateStr) {
    return null;
  }
  try {
    return new Date(dateStr);
  } catch (e) {
    throw new Error("无效的日期格式。请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS。");
  }
}

/**
 * 根据时间周期获取时间范围
 * @param {string} timePeriodStr 时间周期字符串
 * @param {string} referenceDateStr 参考日期字符串
 * @returns {Array} [开始日期, 结束日期]
 */
function getTimeRangeFromPeriod(timePeriodStr, referenceDateStr = null) {
  let today = new Date();
  if (referenceDateStr) {
    try {
      today = parseDateOptional(referenceDateStr) || today;
    } catch (e) {
      // 忽略错误，使用当前日期
    }
  }

  let startDate = null;
  let endDate = null;

  if (!timePeriodStr) {
    return [null, null];
  }

  const timePeriodLower = timePeriodStr.toLowerCase();

  // 尝试解析为具体日期 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(timePeriodStr)) {
    const dt = new Date(timePeriodStr);
    return [dt, dt];
  }
  
  // 尝试解析为年月 YYYY-MM
  if (/^\d{4}-\d{2}$/.test(timePeriodStr)) {
    const year = parseInt(timePeriodStr.split('-')[0]);
    const month = parseInt(timePeriodStr.split('-')[1]) - 1; // JavaScript月份从0开始
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0); // 月末日期
    return [startDate, endDate];
  }
  
  // 尝试解析为年份 YYYY
  if (/^\d{4}$/.test(timePeriodStr)) {
    const year = parseInt(timePeriodStr);
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31);
    return [startDate, endDate];
  }

  // 预定义的时间周期
  if (timePeriodLower === "today" || timePeriodLower === "今天") {
    startDate = endDate = today;
  } else if (timePeriodLower === "yesterday" || timePeriodLower === "昨天") {
    startDate = endDate = new Date(today);
    startDate.setDate(today.getDate() - 1);
    endDate = new Date(startDate);
  } else if (timePeriodLower === "this_week" || timePeriodLower === "本周") {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // 从周一开始
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 到周日结束
  } else if (timePeriodLower === "last_week" || timePeriodLower === "上周") {
    const endOfLastWeek = new Date(today);
    endOfLastWeek.setDate(today.getDate() - today.getDay() - (today.getDay() === 0 ? 0 : 0));
    startDate = new Date(endOfLastWeek);
    startDate.setDate(endOfLastWeek.getDate() - 6);
    endDate = new Date(endOfLastWeek);
  } else if (timePeriodLower === "this_month" || timePeriodLower === "本月") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (timePeriodLower === "last_month" || timePeriodLower === "上月") {
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(firstDayCurrentMonth);
    endDate.setDate(endDate.getDate() - 1);
    startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  } else if (timePeriodLower === "this_year" || timePeriodLower === "今年") {
    startDate = new Date(today.getFullYear(), 0, 1);
    endDate = new Date(today.getFullYear(), 11, 31);
  } else if (timePeriodLower === "last_year" || timePeriodLower === "去年") {
    const lastYearNum = today.getFullYear() - 1;
    startDate = new Date(lastYearNum, 0, 1);
    endDate = new Date(lastYearNum, 11, 31);
  }

  if (startDate && endDate) {
    // 将时间设置为起始日的00:00:00和结束日的23:59:59
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return [startDate, endDate];
  } else {
    throw new Error(`不支持的时间周期字符串: ${timePeriodStr}`);
  }
}

/**
 * 格式化日期为数据库查询字符串
 * @param {Date} date 日期对象 
 * @returns {string} 格式化的日期字符串
 */
function formatDateTimeForDb(date) {
  if (!date) return null;
  return date.toISOString().replace('T', ' ').substr(0, 19);
}

/**
 * API服务类
 */
class ApiService {
  /**
   * 获取交易详情
   * @param {number} entryId 交易ID
   * @returns {Promise<Object|null>} 交易详情
   */
  async getTransactionDetails(entryId) {
    const db = getDb();
    const allEntries = await db.getEntries();
    for (const entry of allEntries) {
      if (entry.id === entryId) {
        return entry;
      }
    }
    return null;
  }

  /**
   * 获取过滤后的交易列表
   * @param {Object} options 过滤选项
   * @returns {Promise<Array>} 交易列表
   */
  async getFilteredTransactionList(options = {}) {
    const {
      startDateStr = null, 
      endDateStr = null, 
      timePeriod = null, 
      incomeExpenseType = null,
      categories = null
    } = options;
    
    const db = getDb();
    
    let sDate = null;
    let eDate = null;
    
    if (timePeriod) {
      [sDate, eDate] = getTimeRangeFromPeriod(timePeriod);
    }
    
    if (startDateStr) {
      sDate = parseDateOptional(startDateStr);
    }
    if (endDateStr) {
      eDate = parseDateOptional(endDateStr);
    }

    const startDatetimeQueryStr = sDate ? formatDateTimeForDb(sDate) : null;
    const endDatetimeQueryStr = eDate ? formatDateTimeForDb(eDate) : null;

    let entryTypeFilterParam = null;
    if (incomeExpenseType && incomeExpenseType.toLowerCase() === "income") {
      entryTypeFilterParam = "income";
    } else if (incomeExpenseType && incomeExpenseType.toLowerCase() === "expense") {
      entryTypeFilterParam = "expense";
    }
    
    const includeIncomeParam = entryTypeFilterParam !== "expense";
    const includeExpenseParam = entryTypeFilterParam !== "income";
    
    const entries = await db.getEntries(
      startDatetimeQueryStr, 
      endDatetimeQueryStr, 
      categories, 
      includeIncomeParam,
      includeExpenseParam
    );
    
    return entries;
  }
  /**
   * 获取汇总统计数据
   * @param {Object} options 过滤选项
   * @returns {Promise<Object>} 汇总统计数据
   */
  async getSummaryStatistics(options = {}) {
    const {
      startDateStr = null, 
      endDateStr = null, 
      timePeriod = null, 
      categories = null
    } = options;
    
    const transactions = await this.getFilteredTransactionList({
      startDateStr,
      endDateStr,
      timePeriod,
      incomeExpenseType: "all",
      categories
    });
    
    let totalIncome = 0.0;
    let totalExpense = 0.0;
    let incomeByCategory = {};
    let expenseByCategory = {};
    
    for (const t of transactions) {
      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        totalIncome += amount;
      } else if (t.type === 'expense') {
        totalExpense += Math.abs(amount);
      }
    }
    
    const netIncome = totalIncome - totalExpense;
    const totalFlow = totalIncome + totalExpense;
    
    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_income: netIncome,
      total_flow: totalFlow,
      count: transactions.length,
      income_percentage: totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 50,
      expense_percentage: totalFlow > 0 ? (totalExpense / totalFlow) * 100 : 50
    };
  }

  /**
   * 处理聊天消息
   * @param {string} message 用户消息
   * @returns {Promise<Object|string>} 回复
   */
  async handleChatMessage(message) {
    const ai = getAiAccountant();
    return await ai.processUserMessage(message);
  }

  /**
   * 启动AI助手
   * @returns {Promise<Object>} 状态
   */
  async startAI() {
    try {
      const ai = getAiAccountant();
      // 简单确认AI是否可用
      if (ai) {
        return { success: true, message: "AI记账助手已启动" };
      } else {
        return { success: false, message: "AI记账助手启动失败" };
      }
    } catch (error) {
      console.error("AI启动错误:", error);
      return { success: false, message: error.message, error: error };
    }
  }

  /**
   * 获取类别分布数据
   * @param {Object} options 过滤选项
   * @returns {Promise<Object>} 类别分布数据
   */
  async getCategoryDistribution(options = {}) {
    const {
      startDateStr = null, 
      endDateStr = null, 
      timePeriod = null, 
      incomeExpenseFocus = "all",
      parentCategories = null
    } = options;
    
    const transactions = await this.getFilteredTransactionList({
      startDateStr,
      endDateStr,
      timePeriod,
      incomeExpenseType: incomeExpenseFocus === "all" ? null : incomeExpenseFocus,
      categories: parentCategories
    });
    
    const categoryData = {};
    
    for (const transaction of transactions) {
      const amount = Math.abs(parseFloat(transaction.amount));
      const category = transaction.category || '其他';
      const type = transaction.type;
      
      // 根据incomeExpenseFocus筛选
      if (incomeExpenseFocus !== "all" && incomeExpenseFocus !== type) {
        continue;
      }
      
      if (!categoryData[category]) {
        categoryData[category] = 0;
      }
      categoryData[category] += amount;
    }
    
    // 转换为前端需要的格式
    const result = Object.entries(categoryData).map(([category, amount]) => ({
      category,
      amount
    }));
    
    return result;
  }
  
  /**
   * 获取时间序列数据（趋势数据）
   * @param {Object} options 过滤选项 
   * @returns {Promise<Array>} 时间序列数据
   */
  async getTimeSeries(options = {}) {
    const {
      startDateStr = null, 
      endDateStr = null,
      incomeExpenseFocus = "net_income", // income, expense, net_income, total_flow
      categories = null,
      timeUnit = "day" // day, week, month, year
    } = options;
    
    // 解析日期
    const queryStartDate = parseDateOptional(startDateStr);
    const queryEndDate = parseDateOptional(endDateStr);
    
    if (!queryStartDate || !queryEndDate) {
      throw new Error(`时间序列数据的日期范围无效: ${startDateStr} 到 ${endDateStr}`);
    }
    
    // 获取交易数据
    const allTransactions = await this.getFilteredTransactionList({
      startDateStr,
      endDateStr,
      incomeExpenseType: "all",
      categories
    });
    
    // 按日期分组数据
    const dataByDate = {};
    
    for (const transaction of allTransactions) {
      const currentAmount = parseFloat(transaction.amount);
      let itemDatetime;
      
      // 处理datetime字符串格式
      if (typeof transaction.datetime === 'string') {
        itemDatetime = new Date(transaction.datetime.replace(' ', 'T'));
      } else if (transaction.datetime instanceof Date) {
        itemDatetime = transaction.datetime;
      } else {
        continue; // 跳过无法解析的日期
      }
      
      // 根据timeUnit获取聚合键
      let groupKey;
      if (timeUnit === 'week') {
        const dayOfWeek = itemDatetime.getDay(); // 0-6
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        groupKey = weekdays[dayOfWeek];
      } else if (timeUnit === 'month') {
        groupKey = itemDatetime.getDate().toString() + '日'; // 日期
      } else if (timeUnit === 'year') {
        groupKey = (itemDatetime.getMonth() + 1).toString() + '月'; // 月份
      } else {
        // 默认按日期分组
        groupKey = itemDatetime.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      if (!dataByDate[groupKey]) {
        dataByDate[groupKey] = {
          income: 0,
          expense: 0,
          net: 0,
          total: 0,
          date: itemDatetime.toISOString().split('T')[0],
          day_of_week: timeUnit === 'week' ? groupKey : null,
          day: timeUnit === 'month' ? parseInt(groupKey) : null,
          month_of_year: timeUnit === 'year' ? groupKey : null
        };
      }
      
      // 根据类型聚合数据
      const valueToAggregate = Math.abs(currentAmount);
      if (transaction.type === 'income') {
        dataByDate[groupKey].income += valueToAggregate;
        dataByDate[groupKey].net += valueToAggregate;
        dataByDate[groupKey].total += valueToAggregate;
      } else if (transaction.type === 'expense') {
        dataByDate[groupKey].expense += valueToAggregate;
        dataByDate[groupKey].net -= valueToAggregate;
        dataByDate[groupKey].total += valueToAggregate;
      }
    }
    
    // 转换为数组格式
    const result = Object.entries(dataByDate).map(([key, data]) => ({
      group_key: key,
      date: data.date,
      income: data.income,
      expense: data.expense,
      net: data.net,
      total: data.total,
      day_of_week: data.day_of_week,
      day: data.day,
      month_of_year: data.month_of_year
    }));
    
    // 按日期排序
    if (timeUnit === 'day') {
      result.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (timeUnit === 'month') {
      result.sort((a, b) => parseInt(a.day) - parseInt(b.day));
    } else if (timeUnit === 'year') {
      const monthOrder = {'1月': 1, '2月': 2, '3月': 3, '4月': 4, '5月': 5, '6月': 6, 
                          '7月': 7, '8月': 8, '9月': 9, '10月': 10, '11月': 11, '12月': 12};
      result.sort((a, b) => monthOrder[a.group_key] - monthOrder[b.group_key]);
    } else if (timeUnit === 'week') {
      const weekOrder = {'周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7};
      result.sort((a, b) => weekOrder[a.group_key] - weekOrder[b.group_key]);
    }
    
    return result;
  }

  /**
   * 获取图表数据
   * @param {Object} filters 筛选条件 
   * @returns {Promise<Object>} 图表数据
   */
  async getChartData(filters = {}) {
    try {
      const {
        startDateStr,
        endDateStr,
        timePeriod,
        chartType = 'line',
        timeUnit = 'day',
        incomeExpenseFocus = 'net_income',
        expenseCategories = [],
        incomeCategories = []
      } = filters;

      // 合并所有筛选类别
      const allFilteredCategories = [...expenseCategories, ...incomeCategories];
      const combinedCategories = allFilteredCategories.length > 0 ? allFilteredCategories : null;

      // 1. 汇总统计
      const summaryStats = await this.getSummaryStatistics({
        startDateStr,
        endDateStr,
        timePeriod,
        categories: combinedCategories
      });

      // 2. 分类分布
      const expenseCategoryDistribution = await this.getCategoryDistribution({
        startDateStr,
        endDateStr,
        timePeriod,
        incomeExpenseFocus: "expense",
        parentCategories: expenseCategories.length > 0 ? expenseCategories : null
      });
      
      const incomeCategoryDistribution = await this.getCategoryDistribution({
        startDateStr,
        endDateStr,
        timePeriod,
        incomeExpenseFocus: "income",
        parentCategories: incomeCategories.length > 0 ? incomeCategories : null
      });

      // 3. 趋势数据
      const trendData = await this.getTimeSeries({
        startDateStr,
        endDateStr,
        incomeExpenseFocus,
        categories: combinedCategories,
        timeUnit
      });

      return {
        summaryStats,
        expenseCategoryDistribution,
        incomeCategoryDistribution,
        trendData
      };
    } catch (error) {
      console.error("获取图表数据出错:", error);
      throw error;
    }
  }
}

export default new ApiService();
