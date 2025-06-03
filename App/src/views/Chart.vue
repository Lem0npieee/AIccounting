<template>
  <div class="chart-container">
    <!-- 筛选按钮 -->
    <button class="filter-btn" @click="showFilter = true">
      <span class="filter-icon">🔍</span> 筛选
    </button>
    <!-- 筛选弹窗 -->
    <div v-if="showFilter" class="filter-modal">
      <div class="filter-mask" @click="closeFilter"></div>
      <div class="filter-panel">
        <div class="filter-title">筛选</div>
        <!-- 时间维度 -->
        <div class="filter-section">
          <span class="filter-label">时间维度：</span>
          <button
            v-for="type in timeTypes"
            :key="type.value"
            :class="[
              'filter-time-btn',
              { active: filterTimeType === type.value },
            ]"
            @click="filterTimeType = type.value"
          >
            {{ type.label }}
          </button>
        </div>
        <!-- 支出类别 -->
        <div class="filter-section">
          <span class="filter-label">支出类别：</span>
          <div class="filter-category-list">
            <div
              v-for="cat in expenseCategories"
              :key="cat"
              :class="[
                'filter-category',
                { selected: filterExpense.includes(cat) },
              ]"
              @click="toggleCategory('expense', cat)"
            >
              <span class="cat-icon">{{ getCategoryIcon(cat) }}</span>
              <span class="cat-name">{{ cat }}</span>
            </div>
          </div>
        </div>
        <!-- 收入类别 -->
        <div class="filter-section">
          <span class="filter-label">收入类别：</span>
          <div class="filter-category-list">
            <div
              v-for="cat in incomeCategories"
              :key="cat"
              :class="[
                'filter-category',
                { selected: filterIncome.includes(cat) },
              ]"
              @click="toggleCategory('income', cat)"
            >
              <span class="cat-icon">{{ getCategoryIcon(cat) }}</span>
              <span class="cat-name">{{ cat }}</span>
            </div>
          </div>
        </div>
        <!-- 操作按钮 -->
        <div class="filter-actions">
          <button class="reset-btn" @click="resetFilter">重置</button>
          <button class="confirm-btn" @click="applyFilter">确定</button>
        </div>
      </div>
    </div>
    <!-- 收支概览卡片 -->
    <div class="overview-card">
      <div class="overview-item">
        <div class="overview-title">收入</div>
        <div class="overview-amount income">¥{{ totalIncome.toFixed(2) }}</div>
      </div>
      <div class="divider"></div>
      <div class="overview-item">
        <div class="overview-title">支出</div>
        <div class="overview-amount expense">
          ¥{{ totalExpense.toFixed(2) }}
        </div>
      </div>
      <div class="divider"></div>
      <div class="overview-item">
        <div class="overview-title">结余</div>
        <div
          class="overview-amount"
          :class="{ income: totalBalance >= 0, expense: totalBalance < 0 }"
        >
          ¥{{ totalBalance.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- 图表切换标签 -->
    <div class="chart-tabs">
      <div
        class="chart-tab"
        :class="{ active: activeTab === 'expense' }"
        @click="activeTab = 'expense'"
      >
        支出分析
      </div>
      <div
        class="chart-tab"
        :class="{ active: activeTab === 'income' }"
        @click="activeTab = 'income'"
      >
        收入分析
      </div>
      <div
        class="chart-tab"
        :class="{ active: activeTab === 'trend' }"
        @click="activeTab = 'trend'"
      >
        收支趋势
      </div>
    </div>

    <!-- 饼图容器 -->
    <div
      class="pie-chart-container"
      v-if="activeTab === 'expense' || activeTab === 'income'"
    >
      <div class="pie-chart-svg-wrapper">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <g v-if="getCategoryData().length">
            <circle
              v-for="(item, idx) in getCategoryData()"
              :key="item.category"
              :r="90"
              cx="110"
              cy="110"
              fill="none"
              :stroke="getCategoryColor(item.category)"
              stroke-width="30"
              :stroke-dasharray="getPieDashArray(item.percentage)"
              :stroke-dashoffset="getPieDashOffset(idx)"
              stroke-linecap="butt"
              :transform="'rotate(-90 110 110)'"
            />
          </g>
          <circle r="75" cx="110" cy="110" fill="#f5f7fa" />
          <text
            x="110"
            y="105"
            text-anchor="middle"
            class="total-amount"
            style="font-size: 20px; font-weight: bold"
          >
            {{ activeTab === "income" ? "收入" : "支出" }}
          </text>
          <text
            x="110"
            y="135"
            text-anchor="middle"
            class="total-value"
            style="font-size: 20px; font-weight: bold"
          >
            ¥{{ getTotalAmount() }}
          </text>
        </svg>
      </div>
      <!-- 分类列表 -->
      <div class="category-list">
        <div
          class="category-item"
          v-for="(item, index) in getCategoryData()"
          :key="index"
        >
          <div
            class="category-color"
            :style="{ backgroundColor: getCategoryColor(item.category) }"
          ></div>
          <div class="category-name">{{ item.category }}</div>
          <div class="category-percent">{{ item.percentage.toFixed(1) }}%</div>
          <div
            class="category-amount"
            :class="activeTab === 'income' ? 'income' : 'expense'"
          >
            ¥{{ item.amount.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势图容器 -->
    <div class="trend-chart-container" v-if="activeTab === 'trend'">
      <div class="trend-chart-placeholder">
        <div class="trend-chart">
          <!-- 坐标轴 -->
          <svg width="100%" height="220" viewBox="0 0 420 220">
            <!-- Y轴 -->
            <line
              x1="40"
              y1="20"
              x2="40"
              y2="200"
              stroke="#dcdfe6"
              stroke-width="2"
            />
            <!-- X轴 -->
            <line
              x1="40"
              y1="200"
              x2="400"
              y2="200"
              stroke="#dcdfe6"
              stroke-width="2"
            />
            <!-- 收入折线 -->
            <polyline
              :points="getLinePoints('income')"
              fill="none"
              stroke="#67C23A"
              stroke-width="3"
            />
            <!-- 支出折线 -->
            <polyline
              :points="getLinePoints('expense')"
              fill="none"
              stroke="#F56C6C"
              stroke-width="3"
            />
            <!-- 收入点 -->
            <circle
              v-for="(pt, idx) in getLineDots('income')"
              :key="'income' + idx"
              :cx="pt.x"
              :cy="pt.y"
              r="4"
              fill="#67C23A"
            />
            <!-- 支出点 -->
            <circle
              v-for="(pt, idx) in getLineDots('expense')"
              :key="'expense' + idx"
              :cx="pt.x"
              :cy="pt.y"
              r="4"
              fill="#F56C6C"
            />
            <!-- 日期标签 -->
            <text
              v-for="(day, idx) in getTrendXAxisLabels()"
              :key="'date' + idx"
              :x="40 + idx * (360 / (getTrendXAxisLabels().length - 1 || 1))"
              y="215"
              text-anchor="middle"
              font-size="12"
              fill="#909399"
            >
              {{ day }}
            </text>
            <!-- 金额刻度 -->
            <text
              v-for="tick in 5"
              :key="'tick' + tick"
              x="30"
              :y="200 - (tick - 1) * 45"
              text-anchor="end"
              font-size="12"
              fill="#909399"
            >
              {{ Math.round((getMaxTrendValue() * (tick - 1)) / 4) }}
            </text>
          </svg>
          <!-- 图例 -->
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color expense-color"></div>
              <div class="legend-label">支出</div>
            </div>
            <div class="legend-item">
              <div class="legend-color income-color"></div>
              <div class="legend-label">收入</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 前5笔最高支出交易 -->
      <div
        class="top-transactions-section"
        v-if="topExpenseTransactions.length > 0"
      >
        <h3 class="top-transactions-title expense">前5笔最高支出</h3>
        <div class="top-transactions-list">
          <div
            v-for="(item, index) in topExpenseTransactions"
            :key="'expense-' + index"
            class="top-transaction-item"
          >
            <div class="transaction-info">
              <div class="transaction-name">{{ item.specific_name }}</div>
              <div class="transaction-category">
                {{ item.categoryTag || item.category }}
              </div>
            </div>
            <div class="transaction-bar-container">
              <div
                class="transaction-bar expense"
                :style="{
                  width:
                    (item.amount / topExpenseTransactions[0].amount) * 100 +
                    '%',
                }"
              ></div>
            </div>
            <div class="transaction-amount expense">
              -¥{{ item.amount.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 前5笔最高收入交易 -->
      <div
        class="top-transactions-section"
        v-if="topIncomeTransactions.length > 0"
      >
        <h3 class="top-transactions-title income">前5笔最高收入</h3>
        <div class="top-transactions-list">
          <div
            v-for="(item, index) in topIncomeTransactions"
            :key="'income-' + index"
            class="top-transaction-item"
          >
            <div class="transaction-info">
              <div class="transaction-name">{{ item.specific_name }}</div>
              <div class="transaction-category">
                {{ item.categoryTag || item.category }}
              </div>
            </div>
            <div class="transaction-bar-container">
              <div
                class="transaction-bar income"
                :style="{
                  width:
                    (item.amount / topIncomeTransactions[0].amount) * 100 + '%',
                }"
              ></div>
            </div>
            <div class="transaction-amount income">
              +¥{{ item.amount.toFixed(2) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "Chart",
  data() {
    return {
      showFilter: false,
      timeTypes: [
        { label: "按周", value: "week" },
        { label: "按月", value: "month" },
        { label: "按年", value: "year" },
      ],
      filterTimeType: "week",
      expenseCategories: [
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
      incomeCategories: ["工资", "奖金", "补贴", "兼职", "投资", "其他收入"],
      filterExpense: [
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
      filterIncome: ["工资", "奖金", "补贴", "兼职", "投资", "其他收入"],
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      activeTab: "trend", // 改为初始显示趋势页面以便测试
      apiBaseUrl: "http://localhost:5000", // 后端数据
      summary: { income: 0, expense: 0, balance: 0 },
      incomeCategoryData: [],
      expenseCategoryData: [],
      trendData: [], // 净收入数据（原有）
      incomeTrendData: [], // 新增：纯收入数据
      expenseTrendData: [], // 新增：纯支出数据
      ledgerEntries: [],
      isLoading: false,
      error: null,

      // 前5笔最高金额交易数据
      topExpenseTransactions: [],
      topIncomeTransactions: [],
    };
  },
  computed: {
    totalIncome() {
      return this.summary.income;
    },
    totalExpense() {
      return this.summary.expense;
    },
    totalBalance() {
      return this.summary.balance;
    },
  },
  mounted() {
    this.fetchChartData();
  },
  methods: {
    // 切换月份
    changeMonth(diff) {
      let newMonth = this.currentMonth + diff;
      if (newMonth > 12) {
        this.currentMonth = 1;
        this.currentYear++;
      } else if (newMonth < 1) {
        this.currentMonth = 12;
        this.currentYear--;
      } else {
        this.currentMonth = newMonth;
      }
      this.fetchChartData();
    },
    // 应用筛选
    applyFilter() {
      this.showFilter = false;
      this.fetchChartData();
    }, // 处理获取前5笔最高金额交易
    async processTopTransactions(startDate, endDate) {
      try {
        console.log(
          "processTopTransactions - 开始获取前5笔交易",
          startDate,
          endDate,
        );
        // 直接使用已有的交易数据
        const transactions = this.ledgerEntries;
        console.log("使用现有ledgerEntries数据:", transactions.length);
        // 处理收入交易
        const incomeTransactions = transactions
          .filter((t) => t.amount > 0) // 正数为收入
          .map((t) => ({
            ...t,
            amount: Math.abs(parseFloat(t.amount || 0)),
            specific_name: t.specificName || t.categoryTag,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        // 处理支出交易
        const expenseTransactions = transactions
          .filter((t) => t.amount < 0) // 负数为支出
          .map((t) => ({
            ...t,
            amount: Math.abs(parseFloat(t.amount || 0)),
            specific_name: t.specificName || t.categoryTag,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        // 更新状态
        this.topIncomeTransactions = incomeTransactions;
        this.topExpenseTransactions = expenseTransactions;

        console.log(
          "processTopTransactions - topIncomeTransactions:",
          this.topIncomeTransactions,
        );
        console.log(
          "processTopTransactions - topExpenseTransactions:",
          this.topExpenseTransactions,
        );
      } catch (error) {
        console.error("获取前5笔交易失败:", error);
      }
    },

    // 获取后端图表数据
    async fetchChartData() {
      this.isLoading = true;
      this.error = null;
      try {
        // 构建日期范围
        let startDate, endDate;
        const now = new Date();
        if (this.filterTimeType === "week") {
          // 过去7天（包括今天）
          const endDate_obj = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const startDate_obj = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          startDate_obj.setDate(startDate_obj.getDate() - 6); // 向前推6天，加上今天共7天

          startDate = startDate_obj.toISOString().substr(0, 10);
          endDate = endDate_obj.toISOString().substr(0, 10);
        } else if (this.filterTimeType === "month") {
          // 本月
          startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, "0")}-01`;
          const lastDay = new Date(
            this.currentYear,
            this.currentMonth,
            0,
          ).getDate();
          endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, "0")}-${lastDay}`;
        } else {
          // 本年
          startDate = `${this.currentYear}-01-01`;
          endDate = `${this.currentYear}-12-31`;
        }

        const requestParams = {
          income_categories: this.filterIncome,
          expense_categories: this.filterExpense,
          start_date: startDate,
          end_date: endDate,
          time_unit:
            this.filterTimeType === "week"
              ? "day_of_week"
              : this.filterTimeType === "month"
                ? "day_of_month"
                : "month_of_year",
        };

        console.log("发送请求的参数:", {
          url: `${this.apiBaseUrl}/get_chart_data_from_filters`,
          params: requestParams,
        }); // 使用requestParams发送请求
        console.log("发送请求参数:", requestParams);

        const response = await axios.post(
          `${this.apiBaseUrl}/get_chart_data_from_filters`,
          requestParams,
        );

        if (response.data.error) throw new Error(response.data.error);

        // 更新数据
        this.summary = {
          income: response.data.summary_statistics.total_income,
          expense: response.data.summary_statistics.total_expense,
          balance: response.data.summary_statistics.net_income,
        };
        this.incomeCategoryData = response.data.income_category_distribution;
        this.expenseCategoryData = response.data.expense_category_distribution;
        this.trendData = response.data.daily_net_income_series;
        this.incomeTrendData = response.data.daily_income_series || [];
        this.expenseTrendData = response.data.daily_expense_series || []; // 数据更新后的状态
        console.log("数据更新后的状态:", {
          summary: this.summary,
          trendData: this.trendData,
          incomeTrendData: this.incomeTrendData,
          expenseTrendData: this.expenseTrendData,
        });

        // 调试年视图数据
        if (this.filterTimeType === "year") {
          console.log("年视图调试 - 月份标签:", this.getTrendXAxisLabels());
          console.log(
            "年视图调试 - 收入数据:",
            this.getTrendSeriesData("income"),
          );
          console.log(
            "年视图调试 - 支出数据:",
            this.getTrendSeriesData("expense"),
          );
        }

        // 合并所有明细
        this.ledgerEntries = [
          ...response.data.filtered_income_transactions.map((e) => ({
            ...e,
            amount: Math.abs(e.amount),
            categoryTag: e.category,
            specificName: e.specific_name,
            time: e.datetime,
          })),
          ...response.data.filtered_expense_transactions.map((e) => ({
            ...e,
            amount: -Math.abs(e.amount),
            categoryTag: e.category,
            specificName: e.specific_name,
            time: e.datetime,
          })),
        ];

        // 获取前5笔最高金额交易
        await this.processTopTransactions(startDate, endDate);
      } catch (error) {
        this.error = "获取图表数据失败";
        console.error("图表数据获取失败:", error);
      } finally {
        this.isLoading = false;
      }
    },
    // 获取分类数据
    getCategoryData() {
      let data, total;
      if (this.activeTab === "income") {
        data = this.incomeCategoryData;
      } else {
        data = this.expenseCategoryData;
      }
      total = data.reduce((sum, item) => sum + item.value, 0) || 1;
      return data.map((item) => ({
        category: item.category,
        amount: item.value,
        percentage: (item.value / total) * 100,
      }));
    },

    // 获取分类颜色
    getCategoryColor(category) {
      // 为不同分类设置不同颜色
      const colorMap = {
        // 收入类
        工资: "#67C23A", // 深绿色
        奖金: "#19BE6B", // 亮绿色
        补贴: "#4FC3F7", // 天蓝色
        兼职: "#FFD700", // 金黄色
        投资: "#5C6BC0", // 蓝紫色
        其他收入: "#FFB347", // 橙黄色
        // 支出类
        餐饮: "#FF9F7F",
        购物: "#9FE6B8",
        交通: "#FFDB5C",
        住房: "#9FB6E7",
        娱乐: "#FFB6C1",
        教育: "#87CEEB",
        医疗: "#FFA07A",
        日用品: "#DDA0DD",
        其他支出: "#909399",
      };

      return colorMap[category] || "#909399";
    },

    // 获取最近七天的日期
    getLastSevenDays() {
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().substr(0, 10));
      }
      return dates;
    },

    // 计算柱状图高度
    getBarHeight(day, type) {
      // 找出当天的收入或支出
      const entries = this.ledgerEntries.filter((entry) => {
        const entryDate = entry.time.substr(0, 10);
        return (
          entryDate === day &&
          ((type === "expense" && entry.amount < 0) ||
            (type === "income" && entry.amount > 0))
        );
      });

      // 计算总金额
      const total = entries.reduce(
        (sum, entry) => sum + Math.abs(entry.amount),
        0,
      );

      // 返回高度，最大150像素，最小0像素
      const maxHeight = 150;
      const maxAmount = 1000; // 假设1000是最大金额
      return Math.min(Math.max(0, (total / maxAmount) * maxHeight), maxHeight);
    },

    // 计算条形图宽度
    getBarWidth(day, type) {
      // 找出当天的收入或支出
      const entries = this.ledgerEntries.filter((entry) => {
        const entryDate = entry.time.substr(0, 10);
        return (
          entryDate === day &&
          ((type === "expense" && entry.amount < 0) ||
            (type === "income" && entry.amount > 0))
        );
      });

      // 计算总金额
      const total = entries.reduce(
        (sum, entry) => sum + Math.abs(entry.amount),
        0,
      );

      // 返回宽度百分比，最大100%，最小0%
      const maxAmount = 1000; // 假设1000是最大金额
      return Math.min(Math.max(0, (total / maxAmount) * 100), 100);
    },

    // 获取每日金额
    getDayAmount(day, type) {
      const entries = this.ledgerEntries.filter((entry) => {
        const entryDate = entry.time.substr(0, 10);
        return (
          entryDate === day &&
          ((type === "expense" && entry.amount < 0) ||
            (type === "income" && entry.amount > 0))
        );
      });

      const total = entries.reduce(
        (sum, entry) => sum + Math.abs(entry.amount),
        0,
      );
      return total > 0 ? `¥${total.toFixed(1)}` : "¥0.0";
    },
    getCategoryIcon(category) {
      const icons = {
        // 收入类
        工资: "💰",
        奖金: "🏆",
        补贴: "💵",
        兼职: "💼",
        投资: "📈",
        其他收入: "📝",
        // 支出类
        餐饮: "🍔",
        购物: "🛍️",
        交通: "🚗",
        住房: "🏠",
        娱乐: "🎭",
        教育: "📚",
        医疗: "💊",
        日用品: "🧻",
        其他支出: "📝",
      };
      return icons[category] || "📝";
    },
    toggleCategory(type, cat) {
      const arr = type === "expense" ? this.filterExpense : this.filterIncome;
      const idx = arr.indexOf(cat);
      if (idx > -1) arr.splice(idx, 1);
      else arr.push(cat);
    },
    resetFilter() {
      this.filterTimeType = "week";
      this.filterExpense = [...this.expenseCategories];
      this.filterIncome = [...this.incomeCategories];
    },
    closeFilter() {
      this.showFilter = false;
    },
    // SVG饼图相关
    getPieDashArray(percentage) {
      const RADIUS = 90;
      const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
      const len = (percentage / 100) * CIRCUMFERENCE;
      return `${len} ${CIRCUMFERENCE - len}`;
    },
    getPieDashOffset(idx) {
      // 计算前面所有分类的百分比和，得到当前分类的起始位置
      const data = this.getCategoryData();
      const RADIUS = 90;
      const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
      let sum = 0;
      for (let i = 0; i < idx; i++) {
        sum += data[i].percentage;
      }
      return (-sum / 100) * CIRCUMFERENCE;
    },
    getTotalAmount() {
      return this.activeTab === "expense"
        ? this.totalExpense.toFixed(2)
        : this.totalIncome.toFixed(2);
    },
    // 折线图相关方法
    getMaxAmount() {
      // 取最近七天收入和支出最大值，避免折线超出
      const days = this.getLastSevenDays();
      let max = 0;
      days.forEach((day) => {
        const income = this.ledgerEntries
          .filter((e) => e.amount > 0 && e.time.substr(0, 10) === day)
          .reduce((s, e) => s + e.amount, 0);
        const expense = this.ledgerEntries
          .filter((e) => e.amount < 0 && e.time.substr(0, 10) === day)
          .reduce((s, e) => s + Math.abs(e.amount), 0);
        max = Math.max(max, income, expense);
      });
      return Math.max(max, 100); // 最小100，避免全为0
    },
    // 获取趋势图X轴标签
    getTrendXAxisLabels() {
      if (!this.trendData || !this.trendData.length) return [];
      if (this.filterTimeType === "week") {
        // 如果有后端数据，尝试使用后端提供的标签
        if (this.trendData && this.trendData.length) {
          // 检查是否包含 day_of_week 字段
          if (this.trendData[0].day_of_week) {
            return this.trendData.map((item) => item.day_of_week || "");
          }
        }

        // 如果后端数据不可用或格式不符，创建自定义标签
        const now = new Date();
        const endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        startDate.setDate(startDate.getDate() - 6); // 向前推6天，加上今天共7天

        // 创建所有7天的标签
        const labels = [];
        const weekdays = [
          "周日",
          "周一",
          "周二",
          "周三",
          "周四",
          "周五",
          "周六",
        ];

        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const weekday = weekdays[d.getDay()];
          labels.push(`${month}/${day} ${weekday}`);
        }

        return labels;
      } else if (this.filterTimeType === "month") {
        return this.trendData.map((item, idx) => item.day || idx + 1 + "日");
      } else if (this.filterTimeType === "year") {
        // 如果有后端数据，使用后端提供的月份标签
        if (this.trendData && this.trendData.length) {
          return this.trendData.map((item) => {
            // 处理中文月份到数字月份的转换
            if (item.month_of_year) {
              const chineseMonthMap = {
                一月: "1月",
                二月: "2月",
                三月: "3月",
                四月: "4月",
                五月: "5月",
                六月: "6月",
                七月: "7月",
                八月: "8月",
                九月: "9月",
                十月: "10月",
                十一月: "11月",
                十二月: "12月",
              };
              return chineseMonthMap[item.month_of_year] || item.month_of_year;
            }
            return "";
          });
        } else {
          // 后端数据不存在时，生成默认月份标签
          const monthLabels = [];
          for (let i = 1; i <= 12; i++) {
            monthLabels.push(i + "月");
          }
          return monthLabels;
        }
      }
      return [];
    },
    // 获取趋势图的最大值，用于统一Y轴刻度

    getMaxTrendValue() {
      const netData = this.getTrendSeriesData("net");
      const incomeData = this.getTrendSeriesData("income");
      const expenseData = this.getTrendSeriesData("expense");

      const allValues = [...netData, ...incomeData, ...expenseData];
      const max = Math.max(...allValues);
      return Math.max(max, 100); // 最小100，避免全为0
    }, // 获取趋势数据
    getTrendSeriesData(type = "net") {
      let dataSource = [];
      if (type === "income") {
        dataSource = this.incomeTrendData;
      } else if (type === "expense") {
        dataSource = this.expenseTrendData;
      } else {
        dataSource = this.trendData; // 默认净收入
      }
      console.log(`getTrendSeriesData(${type}) - dataSource:`, dataSource);

      if (!dataSource || !dataSource.length) return [];
      if (this.filterTimeType === "year") {
        // 年视图特殊处理，确保12个月数据完整
        const values = Array(12).fill(0); // 初始化12个月份的数据为0

        // 将API返回的数据映射到对应的月份
        dataSource.forEach((item) => {
          let monthIndex = -1;
          if (item.month_of_year) {
            // 处理中文月份格式（如"一月"、"二月"等）
            const chineseMonthMap = {
              一月: 0,
              二月: 1,
              三月: 2,
              四月: 3,
              五月: 4,
              六月: 5,
              七月: 6,
              八月: 7,
              九月: 8,
              十月: 9,
              十一月: 10,
              十二月: 11,
            };

            if (chineseMonthMap[item.month_of_year] !== undefined) {
              monthIndex = chineseMonthMap[item.month_of_year];
            } else {
              // 如果不是中文月份，尝试提取数字部分（兼容"1月"格式）
              const monthNumStr = item.month_of_year.replace(/[^0-9]/g, "");
              const monthNum = parseInt(monthNumStr);
              if (!isNaN(monthNum)) {
                monthIndex = monthNum - 1; // 月份从1开始，索引从0开始
              }
            }
          } else if (item.month) {
            // 如果直接提供月份数字
            monthIndex = parseInt(item.month) - 1;
          } else if (item.date) {
            // 尝试从日期字符串提取月份
            try {
              const itemDate = new Date(item.date);
              monthIndex = itemDate.getMonth(); // getMonth() 返回 0-11
            } catch (e) {
              console.error("日期解析错误:", e);
            }
          }

          // 安全检查确保索引在有效范围内
          if (monthIndex >= 0 && monthIndex < 12) {
            // 根据数据类型确定要使用的字段
            if (type === "income" && item.income !== undefined) {
              values[monthIndex] = parseFloat(item.income || 0);
            } else if (type === "expense" && item.expense !== undefined) {
              values[monthIndex] = parseFloat(Math.abs(item.expense || 0));
            } else {
              values[monthIndex] = parseFloat(item.value || 0);
            }
          }
        });

        return values;
      } else if (this.filterTimeType === "week") {
        // 检查后端数据格式，如果有day_of_week字段，直接使用后端数据
        if (dataSource && dataSource.length && dataSource[0].day_of_week) {
          const weekdayOrder = [
            "周一",
            "周二",
            "周三",
            "周四",
            "周五",
            "周六",
            "周日",
          ]; // 后端的顺序
          const values = new Array(7).fill(0);

          dataSource.forEach((item) => {
            const idx = weekdayOrder.indexOf(item.day_of_week);
            if (idx !== -1) {
              if (type === "income" && item.income !== undefined) {
                values[idx] = parseFloat(item.income || 0);
              } else if (type === "expense" && item.expense !== undefined) {
                values[idx] = parseFloat(Math.abs(item.expense || 0));
              } else {
                values[idx] = parseFloat(item.value || 0);
              }
            }
          });

          return values;
        }

        // 如果后端数据不含day_of_week字段，则按日期处理
        // 周视图特殊处理，确保7天数据完整
        const now = new Date();
        const endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        startDate.setDate(startDate.getDate() - 6); // 向前推6天，加上今天共7天

        // 创建所有7天的日期字符串
        const allDays = [];
        const values = [];

        // 生成七天的日期字符串数组
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          allDays.push(dateStr);
          values.push(0); // 默认值为0
        }

        // 将API返回的数据映射到对应的日期
        dataSource.forEach((item) => {
          if (item.date) {
            // 标准化日期格式
            let dateStr = item.date;
            try {
              if (typeof dateStr === "string" && dateStr.includes("T")) {
                dateStr = dateStr.split("T")[0];
              }
              const index = allDays.findIndex((day) => day === dateStr);
              if (index !== -1) {
                values[index] = parseFloat(item.value || 0);
              } else {
                // 尝试通过日期对象进行匹配
                const itemDate = new Date(dateStr);
                const formattedDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;
                const newIndex = allDays.findIndex(
                  (day) => day === formattedDateStr,
                );
                if (newIndex !== -1) {
                  values[newIndex] = parseFloat(item.value || 0);
                }
              }
            } catch (e) {
              console.error("日期格式化错误:", e);
            }
          } else if (item.day) {
            // 处理按天返回的数据格式
            const day = parseInt(item.day);
            // 查找对应的日期
            for (let i = 0; i < allDays.length; i++) {
              const dayDate = new Date(allDays[i]);
              if (dayDate.getDate() === day) {
                values[i] = parseFloat(item.value || 0);
                break;
              }
            }
          }
        });

        return values;
      }

      return dataSource.map((item) => item.value || 0);
    },
    // 生成polyline的points字符串
    getLinePoints(type = "net") {
      const data = this.getTrendSeriesData(type);
      console.log(`getLinePoints(${type}) - series data:`, data);
      if (!data.length) return "";

      const max = this.getMaxTrendValue();
      const count = data.length;
      const points = data
        .map((val, idx) => {
          const x = 40 + idx * (360 / (count - 1));
          const y = 200 - (val / max) * 160;
          return `${x},${y}`;
        })
        .join(" ");
      console.log(`getLinePoints(${type}) - points:`, points);
      return points;
    },
    // 生成每个点的坐标数组
    getLineDots(type = "net") {
      const data = this.getTrendSeriesData(type);
      console.log(`getLineDots(${type}) - series data:`, data);
      if (!data.length) return [];

      const max = this.getMaxTrendValue();
      const count = data.length;
      const dots = data.map((val, idx) => {
        const x = 40 + idx * (360 / (count - 1));
        const y = 200 - (val / max) * 160;
        return { x, y };
      });
      console.log(`getLineDots(${type}) - dots:`, dots);
      return dots;
    },
  },
};
</script>

<style scoped>
.chart-container {
  padding: 15px;
  padding-bottom: 150px;
  height: 100%;
  background-color: #f5f7fa;
}

.overview-card {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.overview-item {
  flex: 1;
  text-align: center;
}

.overview-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 5px;
}

.overview-amount {
  font-size: 16px;
  font-weight: 500;
}

.divider {
  width: 1px;
  background-color: #ebeef5;
  margin: 0 15px;
}

.income {
  color: #67c23a;
}

.expense {
  color: #f56c6c;
}

.chart-tabs {
  display: flex;
  background-color: #fff;
  border-radius: 10px;
  margin-bottom: 15px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chart-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  border-bottom: 2px solid transparent;
}

.chart-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.pie-chart-container,
.trend-chart-container {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.pie-chart-svg-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pie-chart-svg-wrapper svg {
  position: absolute;
  left: 0;
  top: 0;
}
.inner-circle-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}
.inner-circle-text .amount {
  font-size: 18px;
  font-weight: 500;
}
.inner-circle-text .label {
  font-size: 12px;
  color: #909399;
}
/* 移除原有静态圆环相关样式 */
.pie-chart-placeholder,
.empty-chart-circle,
.inner-circle {
  display: none !important;
}

.category-list {
  margin-top: 20px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}

.category-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  margin-right: 10px;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.category-percent {
  margin-right: 10px;
  font-size: 14px;
  color: #909399;
}

.category-amount {
  font-size: 14px;
  font-weight: 500;
  width: 80px;
  text-align: right;
}

.trend-chart-placeholder {
  height: 300px;
  padding: 20px 0;
}

.trend-chart {
  height: 100%;
  position: relative;
  padding: 20px 10px 30px;
}

.axis {
  position: absolute;
  background-color: #dcdfe6;
}

.y-axis {
  left: 10px;
  top: 20px;
  bottom: 30px;
  width: 1px;
}

.x-axis {
  left: 10px;
  right: 10px;
  bottom: 30px;
  height: 1px;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  height: calc(100% - 50px);
  padding-left: 20px;
  align-items: flex-end;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
}

.day-label {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.expense-bar,
.income-bar {
  width: 8px;
  margin: 0 2px;
  border-radius: 2px;
}

.expense-bar {
  background-color: #f56c6c;
}

.income-bar {
  background-color: #67c23a;
}

.chart-legend {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-left: 15px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 5px;
}

.expense-color {
  background-color: #f56c6c;
}

.income-color {
  background-color: #67c23a;
}

.legend-label {
  font-size: 12px;
  color: #606266;
}

/* 修改条形图样式 */
.bar-chart-placeholder {
  margin-top: 20px;
  padding: 20px 0;
  padding-bottom: 30px;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 前5笔交易样式 */
.top-transactions-section {
  margin-top: 30px;
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
  padding-bottom: 10px;
}

.top-transactions-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.top-transactions-title.expense::before {
  content: "📉";
  margin-right: 6px;
}

.top-transactions-title.income::before {
  content: "📈";
  margin-right: 6px;
}

.top-transactions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-transaction-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transaction-info {
  width: 80px;
  overflow: hidden;
  flex-shrink: 0;
}

.transaction-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-category {
  font-size: 12px;
  color: #606266;
}

.transaction-bar-container {
  flex: 1;
  height: 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.transaction-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease-out;
}

.transaction-bar.expense {
  background-color: #f56c6c;
}

.transaction-bar.income {
  background-color: #67c23a;
}

.transaction-amount {
  min-width: 90px;
  text-align: right;
  font-weight: bold;
  font-size: 14px;
}

.transaction-amount.expense {
  color: #f56c6c;
}

.transaction-amount.income {
  color: #67c23a;
}

/* 筛选弹窗样式 */
.filter-btn {
  position: absolute;
  top: 15px;
  left: 15px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 14px;
  color: #409eff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 20;
  display: flex;
  align-items: center;
}
.filter-icon {
  margin-right: 6px;
  font-size: 16px;
}
.filter-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}
.filter-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.25);
}
.filter-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  width: 340px;
  max-width: 90vw;
  padding: 28px 22px 18px 22px;
  z-index: 1010;
}
.filter-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 18px;
  text-align: center;
}
.filter-section {
  margin-bottom: 18px;
}
.filter-label {
  font-size: 14px;
  color: #606266;
  margin-right: 10px;
}
.filter-time-btn {
  background: #f5f7fa;
  border: none;
  border-radius: 6px;
  padding: 6px 18px;
  margin-right: 8px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}
.filter-time-btn.active {
  background: #409eff;
  color: #fff;
}
.filter-category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 10px;
  margin-top: 8px;
}
.filter-category {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 40px;
  border-radius: 20px;
  background: #f5f7fa;
  color: #909399;
  font-size: 18px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
  padding: 0 10px;
  margin-bottom: 4px;
  white-space: nowrap;
}
.filter-category.selected {
  background: #e6f7ff;
  color: #409eff;
  border-color: #409eff;
}
.cat-icon {
  font-size: 18px;
  margin-right: 6px;
  margin-bottom: 0;
}
.cat-name {
  font-size: 13px;
  color: #606266;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.filter-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
}
.reset-btn,
.confirm-btn {
  padding: 6px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.reset-btn {
  background: #f5f7fa;
  color: #606266;
}
.confirm-btn {
  background: #409eff;
  color: #fff;
}
</style>
