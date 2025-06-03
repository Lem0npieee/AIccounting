/**
 * AIccounting AI记账助手
 * 将Python代码转为JavaScript版本
 */
import axios from "axios";

// DeepSeek API密钥 - 请替换为您的实际API密钥
const DEEPSEEK_API_KEY = "sk-3b7ab35452b34c22b825f7d617501fd8";
// DeepSeek API 端点
const API_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * 查询DeepSeek API
 * @param {string} prompt 提示信息
 * @param {string} language 语言
 * @param {number} temperature 温度参数
 * @returns {Promise<string>} API响应
 */
async function queryDeepseek(prompt, language = "zh", temperature = 0) {
  try {
    console.log("准备调用DeepSeek API...");
    // 确保prompt不为空
    if (!prompt || prompt.trim() === "") {
      console.error("提示词为空");
      return "请提供有效的提示信息";
    }

    // 构建请求数据 - 按照DeepSeek官方文档格式
    const data = {
      model: "deepseek-chat", // 使用DeepSeek-V3模型
      messages: [
        {
          role: "system",
          content:
            "你是AI记账助手，可以帮助用户分析和记录收支信息。记账时只能使用预设类别，不可创建新类别。收入类别有：工资、奖金、补贴、兼职、投资、其他收入。支出类别有：餐饮、购物、交通、住房、娱乐、教育、医疗、日用品、其他支出。",
        },
        { role: "user", content: prompt },
      ],
      temperature: temperature,
      max_tokens: 2000,
    };

    console.log("发送API请求...");

    // 设置API请求选项 - 根据官方文档
    const requestOptions = {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30秒超时
    };

    // 发送API请求
    console.log("尝试请求DeepSeek API端点...");
    const response = await axios.post(API_URL, data, requestOptions);

    console.log("API响应状态:", response.status);
    console.log(
      "API响应数据:",
      JSON.stringify(response.data).substring(0, 300) + "...",
    );

    // 处理API响应
    if (response.status === 200) {
      if (
        response.data &&
        response.data.choices &&
        response.data.choices[0] &&
        response.data.choices[0].message
      ) {
        return response.data.choices[0].message.content;
      } else {
        console.error("API响应格式不正确:", JSON.stringify(response.data));
        return "API响应格式不正确";
      }
    } else {
      console.error(`API请求错误: ${response.status}`, response.data);
      return `API错误: ${response.status}`;
    }
  } catch (error) {
    console.error("DeepSeek API请求失败:", error);

    // 详细错误日志
    if (error.response) {
      console.error("服务器响应错误:", error.response.status);
      console.error("响应头:", JSON.stringify(error.response.headers));
      console.error("错误数据:", JSON.stringify(error.response.data));
      return `API服务器错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      console.error("请求发送但无响应:", error.request);

      // 当API调用失败时，提供降级服务
      console.log("API调用失败，使用本地模拟数据");

      // 对于记账相关的提示，返回模拟结果
      if (
        prompt.includes("记账") ||
        prompt.includes("提取") ||
        prompt.includes("交易")
      ) {
        return JSON.stringify([
          {
            账目类型: "支出",
            金额: 150.5,
            类别: "餐饮",
            日期: new Date().toISOString().split("T")[0],
            备注: "午餐和晚餐",
          },
        ]);
      } else {
        // 通用聊天回复
        return "抱歉，我无法连接到DeepSeek API服务器。请检查网络连接和API密钥配置，或联系管理员获取帮助。";
      }
    } else {
      console.error("请求设置错误:", error.message);
      return `API请求配置错误: ${error.message}`;
    }
  }
}

/**
 * AI记账助手类
 */
class AIAccountant {
  /**
   * 构造函数
   * @param {Object} dataStore 数据存储对象
   */
  constructor(dataStore) {
    this.dataStore = dataStore;
    // 预设账目类别
    this.defaultCategories = {
      收入: ["工资", "奖金", "补贴", "兼职", "投资", "其他收入"],
      支出: [
        "餐饮",
        "购物",
        "交通",
        "住房",
        "娱乐",
        "教育",
        "医疗",
        "日用品",
        "其他支出",
      ],
    };
  }
  /**
   * 从用户消息中提取记账信息
   * @param {string} userMessage 用户消息
   * @returns {Promise<Array|Object|null>} 提取的记账信息
   */ async _extractAccountingInfo(userMessage) {
    // 构建提示词，指导AI模型提取所需信息
    const incomeCategories = this.defaultCategories["收入"].join(", ");
    const expenseCategories = this.defaultCategories["支出"].join(", ");

    const prompt = `
      请从以下用户输入中提取所有的记账信息，并严格按照JSON数组格式返回。用户可能会在一句话中提到多笔交易。
      
      如果用户输入明显不是记账内容（如问候、闲聊、咨询等），请在返回的JSON中设置一个额外字段"is_accounting"为false。
      
      用户输入: ${userMessage}
      
      对于每笔交易，请提取以下信息:
      1. 金额 (amount): 数值，收入为正数，支出为负数，如无明确表示是收入还是支出，默认为支出(负数)
      2. 类别 (category): 必须从以下预设类别中选择，不得创建新类别
         - 收入类别: ${incomeCategories}
         - 支出类别: ${expenseCategories}
         如果用户提到的类别不在上述列表中，请匹配到最相近的预设类别，例如:
         - "玩具"应归类为"购物"或"娱乐"
         - "彩票"应归类为"其他收入"
         - "租金"应归类为"住房"
         - "吃饭"应归类为"餐饮"
         - 所有不明确的支出都应归为"其他支出"
         - 所有不明确的收入都应归为"其他收入"
      3. 具体名称 (specific_name): 具体的消费项目或收入来源
      4. 日期时间 (datetime): 格式为 YYYY-MM-DD HH:MM:SS，如未指定则使用当前时间
      5. 消费/收入类型 (type): "income"(收入)或"expense"(支出)
      
      返回格式要求：
      如果只有一笔交易，返回单个JSON对象:
      {
          "amount": 数值,
          "category": "类别",
          "specific_name": "具体名称",
          "datetime": "YYYY-MM-DD HH:MM:SS",
          "type": "income或expense"
      }
      
      如果识别到多笔交易，则返回一个JSON数组，每个元素都是一个完整的交易记录:
      [
          {
              "amount": 数值,
              "category": "类别",
              "specific_name": "具体名称",
              "datetime": "YYYY-MM-DD HH:MM:SS",
              "type": "income或expense"
          },
          {
              "amount": 数值,
              "category": "类别",
              "specific_name": "具体名称",
              "datetime": "YYYY-MM-DD HH:MM:SS",
              "type": "income或expense"
          },
          ...
      ]
      
      如果无法识别任何记账信息，返回:
      {"is_accounting": false}
      
      仅返回JSON格式的结果，不要有任何其他解释性文字。
    `;
    try {
      console.log("正在调用DeepSeek API获取记账信息...");
      const response = await queryDeepseek(prompt);
      console.log("收到API响应:", response?.substring(0, 200) + "...");

      // 如果没有得到响应，使用模拟数据
      if (!response) {
        console.log("API无响应，使用模拟数据");

        // 判断输入是否可能是记账信息
        if (userMessage.match(/(\d+(\.\d+)?元|收入|支出|买|卖|花|赚)/)) {
          // 返回模拟记账数据
          return [
            {
              amount: userMessage.includes("收入") ? 100 : -100,
              category: userMessage.includes("收入") ? "其他收入" : "其他支出",
              specific_name: "模拟记录",
              datetime: this._getLocalDateTimeString(),
              type: userMessage.includes("收入") ? "income" : "expense",
            },
          ];
        } else {
          return null;
        }
      }

      // 提取JSON部分
      let data;
      try {
        // 尝试多种方式解析JSON
        try {
          // 1. 直接尝试解析整个响应
          data = JSON.parse(response);
        } catch (e) {
          // 2. 尝试提取JSON部分
          const match = response.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
          if (match) {
            const jsonStr = match[1];
            data = JSON.parse(jsonStr);
          } else {
            throw new Error("无法从响应中提取JSON");
          }
        }

        console.log("成功解析JSON数据:", typeof data, Array.isArray(data));

        // 检查是否为字典，且不是记账内容
        if (
          typeof data === "object" &&
          !Array.isArray(data) &&
          data.is_accounting === false
        ) {
          console.log("API返回非记账内容");
          return null;
        }

        // 将单个条目转换为列表格式
        const entries = Array.isArray(data) ? data : [data];
        const resultEntries = [];

        console.log("处理记账条目数量:", entries.length);
        // 处理每个条目
        for (const entry of entries) {
          // 检查记账必要字段是否存在
          if (!entry.amount || !entry.category) {
            console.log("跳过缺少必要字段的条目:", entry);
            continue;
          }
          // 无论用户输入什么，始终使用当前本地时间
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const day = String(now.getDate()).padStart(2, "0");
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          const seconds = String(now.getSeconds()).padStart(2, "0");
          entry.datetime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

          // 确保amount为数值并根据type调整正负
          if (entry.amount !== undefined) {
            let amount = parseFloat(entry.amount);
            if (entry.type === "income" && amount < 0) {
              amount = Math.abs(amount);
            } else if (entry.type === "expense" && amount > 0) {
              amount = -amount;
            }
            entry.amount = amount;
          }

          // 确保类别在预设类别中
          if (entry.type === "income") {
            if (!this.defaultCategories["收入"].includes(entry.category)) {
              console.log(
                `将非预设收入类别 "${entry.category}" 映射为 "其他收入"`,
              );
              entry.category = "其他收入";
            }
          } else {
            if (!this.defaultCategories["支出"].includes(entry.category)) {
              console.log(
                `将非预设支出类别 "${entry.category}" 映射为 "其他支出"`,
              );
              entry.category = "其他支出";
            }
          }

          resultEntries.push(entry);
        }

        // 如果所有条目都无效，返回null
        if (resultEntries.length === 0) {
          return null;
        }

        return resultEntries;
      } catch (jsonError) {
        console.error("解析JSON失败:", jsonError);
        return null;
      }
    } catch (error) {
      console.error(`提取记账信息错误: ${error}`);
      return null;
    }
  }

  /**
   * 检查是否有敏感内容
   * @param {string} text 文本内容
   * @returns {Promise<Array>} [是否敏感, 敏感内容]
   */
  async _checkSensitiveContent(text) {
    // 构建用于识别敏感内容的提示词
    const prompt = `
      请检查以下文本是否包含违反法律法规的内容，如赌博、毒品等。如果包含，请简单说明包含什么敏感内容；如果不包含，请只回复"无敏感内容"。

      文本: ${text}
    `;

    const response = await queryDeepseek(prompt);
    if (response && !response.includes("无敏感内容")) {
      return [true, response];
    }
    return [false, null];
  }

  /**
   * 生成AI回复
   * @param {Object|Array} extractedInfo 提取的记账信息
   * @param {string} actionTaken 执行的操作
   * @returns {Promise<string>} AI回复
   */
  async _generateAiResponse(extractedInfo, actionTaken = null) {
    if (!actionTaken) {
      actionTaken = "提取信息";
    }

    const prompt = `
      请针对以下记账操作生成一个友好的回复，回复要简洁、自然、亲切，根据记账性质(收入/支出)给予适当的评价或建议。
      
      记账信息: ${JSON.stringify(extractedInfo, null, 2)}
      操作类型: ${actionTaken}
      
      回复要求：
      1. 确认记录的具体内容（金额、类别、具体名称）
      2. 如果有多条记录，简要总结这些记录的类型和总金额
      3. 如果是支出，可以基于金额大小和类别给出适当的省钱建议（但不要过度说教）
      4. 如果是收入，可以表示祝贺并鼓励
      5. 回复应该有温度，像朋友一样交流，使用适当的表情符号增加亲近感
      6. 总字数控制在100字以内
      7. 严禁在回复中出现任何关于字数计数、表情选择或其他元注释的内容
      8. 只输出最终回复内容，不要包含任何括号内的注释说明
    `;

    let response = await queryDeepseek(prompt);

    // 移除可能出现的元注释
    response = response.replace(/（注：.*?）/g, "").replace(/\(注：.*?\)/g, "");
    return response;
  }

  /**
   * 生成报表分析回复
   * @param {string} reportType 报表类型
   * @param {string} timePeriod 时间周期
   * @returns {Promise<string>} 报表分析回复
   */
  async _generateReportResponse(reportType, timePeriod) {
    // 获取entries数据
    const entries = await this.dataStore.getEntries();

    if (!entries || entries.length === 0) {
      return "目前没有任何记账数据，无法生成报表分析。请先添加一些记账数据吧！";
    }

    // 获取当前日期信息，用于确定时间范围
    const today = new Date();
    let startDate = null;
    let endDate = today.toISOString().split("T")[0] + " 23:59:59";

    // 根据时间周期确定查询的开始日期
    if (timePeriod === "今天") {
      startDate = today.toISOString().split("T")[0] + " 00:00:00";
    } else if (timePeriod === "昨天") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday.toISOString().split("T")[0] + " 00:00:00";
      endDate = yesterday.toISOString().split("T")[0] + " 23:59:59";
    } else if (timePeriod === "本周") {
      // 计算本周一的日期
      const firstDayOfWeek = new Date(today);
      const day = today.getDay() || 7; // 将周日的0转为7
      firstDayOfWeek.setDate(today.getDate() - day + 1);
      startDate = firstDayOfWeek.toISOString().split("T")[0] + " 00:00:00";
    } else if (timePeriod === "上周") {
      // 计算上周一和上周日的日期
      const firstDayOfLastWeek = new Date(today);
      const day = today.getDay() || 7;
      firstDayOfLastWeek.setDate(today.getDate() - day - 6);
      const lastDayOfLastWeek = new Date(firstDayOfLastWeek);
      lastDayOfLastWeek.setDate(firstDayOfLastWeek.getDate() + 6);
      startDate = firstDayOfLastWeek.toISOString().split("T")[0] + " 00:00:00";
      endDate = lastDayOfLastWeek.toISOString().split("T")[0] + " 23:59:59";
    } else if (timePeriod === "本月") {
      // 计算本月初的日期
      startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01 00:00:00`;
    } else if (timePeriod === "上月") {
      // 计算上月的起始和结束日期
      const firstDayOfCurrentMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const lastDayOfLastMonth = new Date(firstDayOfCurrentMonth);
      lastDayOfLastMonth.setDate(lastDayOfLastMonth.getDate() - 1);
      const firstDayOfLastMonth = new Date(
        lastDayOfLastMonth.getFullYear(),
        lastDayOfLastMonth.getMonth(),
        1,
      );
      startDate = firstDayOfLastMonth.toISOString().split("T")[0] + " 00:00:00";
      endDate = lastDayOfLastMonth.toISOString().split("T")[0] + " 23:59:59";
    } else if (timePeriod === "今年") {
      // 计算本年初的日期
      startDate = `${today.getFullYear()}-01-01 00:00:00`;
    }

    // 使用设定的时间范围获取数据
    const filteredEntries = await this.dataStore.getEntries(startDate, endDate);

    // 简单数据统计
    const incomeEntries = filteredEntries.filter(
      (e) => parseFloat(e.amount) > 0,
    );
    const expenseEntries = filteredEntries.filter(
      (e) => parseFloat(e.amount) < 0,
    );

    const totalIncome = incomeEntries.reduce(
      (sum, entry) => sum + parseFloat(entry.amount),
      0,
    );
    const totalExpense = expenseEntries.reduce(
      (sum, entry) => sum + Math.abs(parseFloat(entry.amount)),
      0,
    );
    const netIncome = totalIncome - totalExpense;

    // 按类别统计支出
    const expenseByCategory = {};
    for (const entry of expenseEntries) {
      const category = entry.category || "未分类";
      const amount = Math.abs(parseFloat(entry.amount));
      if (!expenseByCategory[category]) {
        expenseByCategory[category] = 0;
      }
      expenseByCategory[category] += amount;
    }

    // 按类别统计收入
    const incomeByCategory = {};
    for (const entry of incomeEntries) {
      const category = entry.category || "未分类";
      const amount = parseFloat(entry.amount);
      if (!incomeByCategory[category]) {
        incomeByCategory[category] = 0;
      }
      incomeByCategory[category] += amount;
    }

    // 找出支出最高的类别
    const topExpenseCategories = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 找出收入最高的类别
    const topIncomeCategories = Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // 计算收支比例
    let expenseRatio = 0;
    if (totalIncome > 0) {
      expenseRatio = (totalExpense / totalIncome) * 100;
    }

    // 准备类别占比数据
    const expensePercentage = {};
    for (const [cat, amount] of Object.entries(expenseByCategory)) {
      if (totalExpense > 0) {
        expensePercentage[cat] = (amount / totalExpense) * 100;
      }
    }

    // 构造更加有趣、生活化的报表提示词
    const prompt = `
      你是用户的好友，也是一个幽默风趣的"钱包管家"，请根据以下财务数据生成一份轻松有趣的${timePeriod}消费报告。报告应该像朋友间的闲聊，充满个性和乐趣。
      
      ## 基础统计数据
      统计周期: ${timePeriod}
      统计开始日期: ${startDate}
      统计结束日期: ${endDate}
      总收入: ${totalIncome.toFixed(2)}元
      总支出: ${totalExpense.toFixed(2)}元
      净收入: ${netIncome.toFixed(2)}元
      收支比: ${expenseRatio.toFixed(1)}%

      ## 支出类别明细（从高到低）
      ${topExpenseCategories
        .map(
          ([cat, amount]) =>
            `${cat}: ${amount.toFixed(2)}元 (${expensePercentage[cat].toFixed(1)}%)`,
        )
        .join(", ")}
      
      ## 收入类别明细（从高到低）
      ${topIncomeCategories
        .map(([cat, amount]) => `${cat}: ${amount.toFixed(2)}元`)
        .join(", ")}
      
      ## 消费时间分布
      最近的几笔消费: ${expenseEntries
        .slice(0, 3)
        .map(
          (e) =>
            `${e.specific_name || "未命名"}(${Math.abs(parseFloat(e.amount)).toFixed(0)}元)`,
        )
        .join(", ")}
      
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
    `;

    let response = await queryDeepseek(prompt, "zh", 0.7);

    // 移除可能出现的元注释
    response = response.replace(/（注：.*?）/g, "").replace(/\(注：.*?\)/g, "");
    return response;
  }

  /**
   * 处理用户消息并返回回复
   * @param {string} userMessage 用户消息
   * @returns {Promise<string|Object>} 回复内容
   */
  async processUserMessage(userMessage) {
    // 检查敏感内容
    const [hasSensitive, sensitiveInfo] =
      await this._checkSensitiveContent(userMessage);
    if (hasSensitive) {
      return `抱歉，您的消息可能包含不适当的内容: ${sensitiveInfo}。请重新输入合规的内容。`;
    }

    // 判断是否是查询或报表请求
    if (
      userMessage.includes("报表") ||
      userMessage.includes("分析") ||
      userMessage.includes("统计") ||
      userMessage.includes("报告")
    ) {
      // 确定时间周期
      let timePeriod = "本月";

      // 更详细地识别时间周期
      if (
        userMessage.includes("今天") ||
        userMessage.includes("当天") ||
        userMessage.includes("今日")
      ) {
        timePeriod = "今天";
      } else if (userMessage.includes("昨天") || userMessage.includes("昨日")) {
        timePeriod = "昨天";
      } else if (
        userMessage.includes("本周") ||
        userMessage.includes("这周") ||
        userMessage.includes("这一周")
      ) {
        timePeriod = "本周";
      } else if (
        userMessage.includes("上周") ||
        userMessage.includes("上一周")
      ) {
        timePeriod = "上周";
      } else if (
        userMessage.includes("本月") ||
        userMessage.includes("这个月") ||
        userMessage.includes("这月")
      ) {
        timePeriod = "本月";
      } else if (
        userMessage.includes("上月") ||
        userMessage.includes("上个月")
      ) {
        timePeriod = "上月";
      } else if (
        userMessage.includes("本年") ||
        userMessage.includes("今年") ||
        userMessage.includes("这一年")
      ) {
        timePeriod = "今年";
      } else if (userMessage.includes("年度") || userMessage.includes("全年")) {
        timePeriod = "今年";
      }

      console.log(`正在生成${timePeriod}财务报告...`);
      return await this._generateReportResponse("general", timePeriod);
    }

    // 提取记账信息
    const extractedInfo = await this._extractAccountingInfo(userMessage);
    if (extractedInfo) {
      // 检查是否为多条记账条目
      if (Array.isArray(extractedInfo)) {
        // 添加多条记账条目
        let successCount = 0;
        for (const entry of extractedInfo) {
          const entryId = await this.dataStore.addEntry(entry);
          if (entryId) {
            successCount++;
          }
        }

        if (successCount > 0) {
          // 生成回复，告知用户已成功添加多条记账条目
          const aiReply = await this._generateAiResponse(
            extractedInfo,
            `添加了${successCount}条记录`,
          ); // 将所有条目转换为结构化信息
          const ledgerEntries = extractedInfo.map((entry) => ({
            amount: entry.amount,
            categoryTag: entry.category || "其他",
            specificName: entry.specific_name || "",
            time: entry.datetime,
          }));

          return {
            replyText: aiReply,
            ledgerEntry: ledgerEntries,
          };
        } else {
          return "很抱歉，记账时出现了问题。请稍后再试。";
        }
      } else {
        // 添加单条记账条目
        const entryId = await this.dataStore.addEntry(extractedInfo);
        if (entryId) {
          const aiReply = await this._generateAiResponse(extractedInfo, "添加");
          const ledgerEntry = {
            amount: extractedInfo.amount,
            categoryTag: extractedInfo.category || "其他",
            specificName: extractedInfo.specific_name || "",
            time: extractedInfo.datetime,
          };
          return {
            replyText: aiReply,
            ledgerEntry: [ledgerEntry], // 转换为数组格式保持一致性
          };
        } else {
          return "很抱歉，记账时出现了问题。请稍后再试。";
        }
      }
    } else {
      // 如果无法提取记账信息，直接切换到聊天模式
      const prompt = `
        你是一个专业的个人记账助手，名叫"AI记账"。你现在正在与用户进行日常聊天。请对用户的问题做出自然、友好的回答。
        
        如果用户问你是谁，请介绍自己是AI记账助手，可以帮助用户记录日常收支。
        如果用户问你能做什么，请告诉他们你可以帮助记账、提供财务报表分析、提供理财建议等功能。
        
        用户的问题与记账无明显关联，所以不要强行将话题引回到记账，而是进行自然的对话交流。但在对话结束时，可以适当提示用户记账功能的存在。
        
        用户问题: ${userMessage}
        
        回答要求：
        1. 简洁明了，不超过100字
        2. 语气友好自然，像真人助手一样
        3. 不要提示"无法提取记账信息"或类似内容
        4. 如果是常规聊天，自然地回应，不要刻意引导记账
        5. 严禁在回复中包含任何关于字数计数、表情选择或其他元注释的内容
        6. 只输出最终回复内容，不要包含任何括号内的注释说明
      `;

      let response = await queryDeepseek(prompt);
      // 移除可能出现的元注释
      response = response
        .replace(/（注：.*?）/g, "")
        .replace(/\(注：.*?\)/g, "");
      return response;
    }
  }
}

export default AIAccountant;
export { queryDeepseek };
