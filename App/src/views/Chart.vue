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
            :class="['filter-time-btn', {active: filterTimeType === type.value}]"
            @click="filterTimeType = type.value"
          >{{ type.label }}</button>
        </div>
        <!-- 支出类别 -->
        <div class="filter-section">
          <span class="filter-label">支出类别：</span>
          <div class="filter-category-list">
            <div
              v-for="cat in expenseCategories"
              :key="cat"
              :class="['filter-category', {selected: filterExpense.includes(cat)}]"
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
              :class="['filter-category', {selected: filterIncome.includes(cat)}]"
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
        <div class="overview-amount expense">¥{{ totalExpense.toFixed(2) }}</div>
      </div>
      <div class="divider"></div>
      <div class="overview-item">
        <div class="overview-title">结余</div>
        <div class="overview-amount" :class="{ 'income': totalBalance >= 0, 'expense': totalBalance < 0 }">
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
      >支出分析</div>
      <div 
        class="chart-tab" 
        :class="{ active: activeTab === 'income' }" 
        @click="activeTab = 'income'"
      >收入分析</div>
      <div 
        class="chart-tab" 
        :class="{ active: activeTab === 'trend' }" 
        @click="activeTab = 'trend'"
      >收支趋势</div>
    </div>

    <!-- 饼图容器 -->
    <div class="pie-chart-container" v-if="activeTab === 'expense' || activeTab === 'income'">
      <div class="pie-chart-svg-wrapper">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <g v-if="getCategoryData().length">
            <circle
              v-for="(item, idx) in getCategoryData()"
              :key="item.category"
              :r="90"
              cx="110" cy="110"
              fill="none"
              :stroke="getCategoryColor(item.category)"
              stroke-width="30"
              :stroke-dasharray="getPieDashArray(item.percentage)"
              :stroke-dashoffset="getPieDashOffset(idx)"
              stroke-linecap="butt"
              :transform="'rotate(-90 110 110)'"
            />
          </g>
          <circle
            r="75"
            cx="110" cy="110"
            fill="#f5f7fa"
          />
          <text
            x="110" y="105"
            text-anchor="middle"
            class="total-amount"
            style="font-size: 20px; font-weight: bold;"
          >
            {{ activeTab === 'income' ? '收入' : '支出' }}
          </text>
          <text
            x="110" y="135"
            text-anchor="middle"
            class="total-value"
            style="font-size: 20px; font-weight: bold;"
          >
            ¥{{ getTotalAmount() }}
          </text>
        </svg>
      </div>
      <!-- 分类列表 -->
      <div class="category-list">
        <div class="category-item" v-for="(item, index) in getCategoryData()" :key="index">
          <div class="category-color" :style="{ backgroundColor: getCategoryColor(item.category) }"></div>
          <div class="category-name">{{ item.category }}</div>
          <div class="category-percent">{{ (item.percentage).toFixed(1) }}%</div>
          <div class="category-amount" :class="activeTab === 'income' ? 'income' : 'expense'">
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
            <line x1="40" y1="20" x2="40" y2="200" stroke="#dcdfe6" stroke-width="2" />
            <!-- X轴 -->
            <line x1="40" y1="200" x2="400" y2="200" stroke="#dcdfe6" stroke-width="2" />
            <!-- 收入折线 -->
            <polyline :points="getLinePoints()" fill="none" stroke="#67C23A" stroke-width="3" />
            <!-- 支出折线 -->
            <polyline :points="getLinePoints()" fill="none" stroke="#F56C6C" stroke-width="3" />
            <!-- 收入点 -->
            <circle v-for="(pt, idx) in getLineDots()" :key="'income'+idx" :cx="pt.x" :cy="pt.y" r="4" fill="#67C23A" />
            <!-- 支出点 -->
            <circle v-for="(pt, idx) in getLineDots()" :key="'expense'+idx" :cx="pt.x" :cy="pt.y" r="4" fill="#F56C6C" />
            <!-- 日期标签 -->
            <text v-for="(day, idx) in getTrendXAxisLabels()" :key="'date'+idx" :x="40 + idx * (360 / (getTrendXAxisLabels().length - 1 || 1))" y="215" text-anchor="middle" font-size="12" fill="#909399">{{ day }}</text>
            <!-- 金额刻度 -->
            <text v-for="tick in 5" :key="'tick'+tick" x="30" :y="200 - (tick-1)*45" text-anchor="end" font-size="12" fill="#909399">{{ Math.round(getMaxAmount() * (tick-1)/4) }}</text>
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

      <!-- 新增条形图 -->
      <div class="bar-chart-placeholder">
        <div class="bar-chart">
          <div class="chart-title">每日收支</div>
          <div class="chart-bars-horizontal">
            <div class="chart-bar-horizontal" v-for="(day, index) in getTrendXAxisLabels()" :key="index">
              <div class="day-label">{{ day }}</div>
              <div class="bars-wrapper">
                <div class="bar-item">
                  <div class="bar-label">收支</div>
                  <div class="bar-container">
                    <div class="income-bar-horizontal" :style="{ width: getBarWidthByTrend(index) + '%' }"></div>
                    <div class="bar-value">{{ getDayAmountByTrend(index) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Chart',
  data() {
    return {
      showFilter: false,
      timeTypes: [
        { label: '按周', value: 'week' },
        { label: '按月', value: 'month' },
        { label: '按年', value: 'year' }
      ],
      filterTimeType: 'week',
      expenseCategories: ['餐饮','购物','交通','住房','娱乐','教育','医疗','日用品','其他支出'],
      incomeCategories: ['工资','奖金','补贴','兼职','投资','其他收入'],
      filterExpense: ['餐饮','购物','交通','住房','娱乐','教育','医疗','日用品','其他支出'],
      filterIncome: ['工资','奖金','补贴','兼职','投资','其他收入'],
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      activeTab: 'expense',
      apiBaseUrl: 'http://localhost:5000',
      // 后端数据
      summary: { income: 0, expense: 0, balance: 0 },
      incomeCategoryData: [],
      expenseCategoryData: [],
      trendData: [],
      ledgerEntries: [],
      isLoading: false,
      error: null
    }
  },
  computed: {
    totalIncome() {
      return this.summary.income
    },
    totalExpense() {
      return this.summary.expense
    },
    totalBalance() {
      return this.summary.balance
    }
  },
  mounted() {
    this.fetchChartData()
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
    },
    // 获取后端图表数据
    async fetchChartData() {
      this.isLoading = true;
      this.error = null;
      try {
        // 构建日期范围
        let startDate, endDate;
        const now = new Date();
        if (this.filterTimeType === 'week') {
          // 本周
          const day = now.getDay() || 7;
          const monday = new Date(now);
          monday.setDate(now.getDate() - day + 1);
          startDate = monday.toISOString().substr(0, 10);
          endDate = new Date(monday.getTime() + 6 * 24 * 3600 * 1000).toISOString().substr(0, 10);
        } else if (this.filterTimeType === 'month') {
          // 本月
          startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
          endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${lastDay}`;
        } else {
          // 本年
          startDate = `${this.currentYear}-01-01`;
          endDate = `${this.currentYear}-12-31`;
        }
        console.log('fetchChartData - 请求参数:', {
          income_categories: this.filterIncome,
          expense_categories: this.filterExpense,
          start_date: startDate,
          end_date: endDate
        });
        // 请求后端
        const response = await axios.post(`${this.apiBaseUrl}/get_chart_data_from_filters`, {
          income_categories: this.filterIncome,
          expense_categories: this.filterExpense,
          start_date: startDate,
          end_date: endDate
        });
        console.log('fetchChartData - 后端返回数据:', response.data);
        if (response.data.error) throw new Error(response.data.error);
        // 汇总
        this.summary = {
          income: response.data.summary_statistics.total_income,
          expense: response.data.summary_statistics.total_expense,
          balance: response.data.summary_statistics.net_income
        };
        this.incomeCategoryData = response.data.income_category_distribution;
        this.expenseCategoryData = response.data.expense_category_distribution;
        this.trendData = response.data.daily_net_income_series;
        console.log('fetchChartData - trendData:', this.trendData);
        // 合并所有明细
        this.ledgerEntries = [
          ...response.data.filtered_income_transactions.map(e => ({ ...e, amount: Math.abs(e.amount), categoryTag: e.category, specificName: e.specific_name, time: e.datetime })),
          ...response.data.filtered_expense_transactions.map(e => ({ ...e, amount: -Math.abs(e.amount), categoryTag: e.category, specificName: e.specific_name, time: e.datetime }))
        ];
      } catch (error) {
        this.error = '获取图表数据失败';
        console.error('图表数据获取失败:', error);
      } finally {
        this.isLoading = false;
      }
    },
    // 获取分类数据
    getCategoryData() {
      let data, total;
      if (this.activeTab === 'income') {
        data = this.incomeCategoryData;
      } else {
        data = this.expenseCategoryData;
      }
      total = data.reduce((sum, item) => sum + item.value, 0) || 1;
      return data.map(item => ({
        category: item.category,
        amount: item.value,
        percentage: (item.value / total) * 100
      }));
    },
    
    // 获取分类颜色
    getCategoryColor(category) {
      // 为不同分类设置不同颜色
      const colorMap = {
        // 收入类
        '工资': '#67C23A',      // 深绿色
        '奖金': '#19BE6B',      // 亮绿色
        '补贴': '#4FC3F7',      // 天蓝色
        '兼职': '#FFD700',      // 金黄色
        '投资': '#5C6BC0',      // 蓝紫色
        '其他收入': '#FFB347',  // 橙黄色
        // 支出类
        '餐饮': '#FF9F7F',
        '购物': '#9FE6B8',
        '交通': '#FFDB5C',
        '住房': '#9FB6E7',
        '娱乐': '#FFB6C1',
        '教育': '#87CEEB',
        '医疗': '#FFA07A',
        '日用品': '#DDA0DD',
        '其他支出': '#909399'
      };
      
      return colorMap[category] || '#909399';
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
      const entries = this.ledgerEntries.filter(entry => {
        const entryDate = entry.time.substr(0, 10);
        return entryDate === day && 
          ((type === 'expense' && entry.amount < 0) || 
           (type === 'income' && entry.amount > 0));
      });
      
      // 计算总金额
      const total = entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      
      // 返回高度，最大150像素，最小0像素
      const maxHeight = 150;
      const maxAmount = 1000; // 假设1000是最大金额
      return Math.min(Math.max(0, (total / maxAmount) * maxHeight), maxHeight);
    },
    
    // 计算条形图宽度
    getBarWidth(day, type) {
      // 找出当天的收入或支出
      const entries = this.ledgerEntries.filter(entry => {
        const entryDate = entry.time.substr(0, 10);
        return entryDate === day && 
          ((type === 'expense' && entry.amount < 0) || 
           (type === 'income' && entry.amount > 0));
      });
      
      // 计算总金额
      const total = entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      
      // 返回宽度百分比，最大100%，最小0%
      const maxAmount = 1000; // 假设1000是最大金额
      return Math.min(Math.max(0, (total / maxAmount) * 100), 100);
    },
    
    // 获取每日金额
    getDayAmount(day, type) {
      const entries = this.ledgerEntries.filter(entry => {
        const entryDate = entry.time.substr(0, 10);
        return entryDate === day && 
          ((type === 'expense' && entry.amount < 0) || 
           (type === 'income' && entry.amount > 0));
      });
      
      const total = entries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      return total > 0 ? `¥${total.toFixed(1)}` : '¥0.0';
    },
    getCategoryIcon(category) {
      const icons = {
        // 收入类
        '工资': '💰',
        '奖金': '🏆',
        '补贴': '💵',
        '兼职': '💼',
        '投资': '📈',
        '其他收入': '📝',
        // 支出类
        '餐饮': '🍔',
        '购物': '🛍️',
        '交通': '🚗',
        '住房': '🏠',
        '娱乐': '🎭',
        '教育': '📚',
        '医疗': '💊',
        '日用品': '🧻',
        '其他支出': '📝'
      }
      return icons[category] || '📝'
    },
    toggleCategory(type, cat) {
      const arr = type === 'expense' ? this.filterExpense : this.filterIncome;
      const idx = arr.indexOf(cat);
      if (idx > -1) arr.splice(idx, 1);
      else arr.push(cat);
    },
    resetFilter() {
      this.filterTimeType = 'week';
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
      return -sum / 100 * CIRCUMFERENCE;
    },
    getTotalAmount() {
      return this.activeTab === 'expense' ? this.totalExpense.toFixed(2) : this.totalIncome.toFixed(2);
    },
    // 折线图相关方法
    getMaxAmount() {
      // 取最近七天收入和支出最大值，避免折线超出
      const days = this.getLastSevenDays();
      let max = 0;
      days.forEach(day => {
        const income = this.ledgerEntries.filter(e => e.amount > 0 && e.time.substr(0,10) === day).reduce((s,e) => s+e.amount, 0);
        const expense = this.ledgerEntries.filter(e => e.amount < 0 && e.time.substr(0,10) === day).reduce((s,e) => s+Math.abs(e.amount), 0);
        max = Math.max(max, income, expense);
      });
      return Math.max(max, 100); // 最小100，避免全为0
    },
    // 获取趋势图X轴标签
    getTrendXAxisLabels() {
      console.log('getTrendXAxisLabels - trendData:', this.trendData);
      console.log('getTrendXAxisLabels - filterTimeType:', this.filterTimeType);
      if (!this.trendData || !this.trendData.length) return [];
      
      if (this.filterTimeType === 'week') {
        return this.trendData.map(item => item.day_of_week || '');
      } else if (this.filterTimeType === 'month') {
        return this.trendData.map((item, idx) => (item.day || (idx + 1) + '日'));
      } else if (this.filterTimeType === 'year') {
        return this.trendData.map(item => item.month_of_year || '');
      }
      return [];
    },
    // 获取趋势数据
    getTrendSeriesData() {
      console.log('getTrendSeriesData - trendData:', this.trendData);
      if (!this.trendData || !this.trendData.length) return [];
      return this.trendData.map(item => item.value || 0);
    },
    // 生成polyline的points字符串
    getLinePoints() {
      const data = this.getTrendSeriesData();
      console.log('getLinePoints - series data:', data);
      if (!data.length) return '';
      
      const max = Math.max(...data, 100);
      const count = data.length;
      const points = data.map((val, idx) => {
        const x = 40 + idx * (360 / (count - 1));
        const y = 200 - (val / max) * 160;
        return `${x},${y}`;
      }).join(' ');
      console.log('getLinePoints - points:', points);
      return points;
    },
    // 生成每个点的坐标数组
    getLineDots() {
      const data = this.getTrendSeriesData();
      console.log('getLineDots - series data:', data);
      if (!data.length) return [];
      
      const max = Math.max(...data, 100);
      const count = data.length;
      const dots = data.map((val, idx) => {
        const x = 40 + idx * (360 / (count - 1));
        const y = 200 - (val / max) * 160;
        return { x, y };
      });
      console.log('getLineDots - dots:', dots);
      return dots;
    },
    // 适配条形图X轴和数据
    getBarWidthByTrend(idx) {
      console.log('getBarWidthByTrend - trendData:', this.trendData);
      console.log('getBarWidthByTrend - idx:', idx);
      const val = this.trendData[idx] ? this.trendData[idx].value || 0 : 0;
      const max = Math.max(...this.getTrendSeriesData(), 100);
      const width = Math.min((val / max) * 100, 100);
      console.log('getBarWidthByTrend - width:', width);
      return width;
    },
    getDayAmountByTrend(idx) {
      console.log('getDayAmountByTrend - trendData:', this.trendData);
      console.log('getDayAmountByTrend - idx:', idx);
      const val = this.trendData[idx] ? this.trendData[idx].value || 0 : 0;
      const amount = `¥${val.toFixed(1)}`;
      console.log('getDayAmountByTrend - amount:', amount);
      return amount;
    },
  }
}
</script>

<style scoped>
.chart-container {
  padding: 15px;
  padding-bottom: 65px;
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
  color: #67C23A;
}

.expense {
  color: #F56C6C;
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

.pie-chart-container, .trend-chart-container {
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
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
.pie-chart-placeholder, .empty-chart-circle, .inner-circle {
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

.expense-bar, .income-bar {
  width: 8px;
  margin: 0 2px;
  border-radius: 2px;
}

.expense-bar {
  background-color: #F56C6C;
}

.income-bar {
  background-color: #67C23A;
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
  background-color: #F56C6C;
}

.income-color {
  background-color: #67C23A;
}

.legend-label {
  font-size: 12px;
  color: #606266;
}

/* 修改条形图样式 */
.bar-chart-placeholder {
  margin-top: 20px;
  padding: 20px 0;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.bar-chart {
  padding: 0 20px;
}

.chart-title {
  font-size: 16px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 15px;
  text-align: center;
}

.chart-bars-horizontal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-bar-horizontal {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.day-label {
  width: 40px;
  font-size: 12px;
  color: #909399;
  text-align: right;
  padding-top: 4px;
}

.bars-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  width: 40px;
  font-size: 12px;
  color: #606266;
}

.bar-container {
  flex: 1;
  height: 20px;
  background-color: #f5f7fa;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
}

.expense-bar-horizontal {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background-color: #F56C6C;
  border-radius: 10px 0 0 10px;
  transition: width 0.3s ease;
}

.income-bar-horizontal {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background-color: #67C23A;
  border-radius: 10px 0 0 10px;
  transition: width 0.3s ease;
}

.bar-value {
  position: absolute;
  right: 8px;
  font-size: 12px;
  color: #606266;
  z-index: 1;
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
  color: #409EFF;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
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
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 1000;
}
.filter-mask {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
}
.filter-panel {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
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
  transition: background 0.2s, color 0.2s;
}
.filter-time-btn.active {
  background: #409EFF;
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
  color: #409EFF;
  border-color: #409EFF;
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
.reset-btn, .confirm-btn {
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
  background: #409EFF;
  color: #fff;
}
</style> 