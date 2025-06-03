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

    <!-- 图表区域 -->
    <div class="chart-area" ref="chartContainer">
      <!-- 支出分析饼图 -->
      <div v-if="activeTab === 'expense'" class="pie-chart">
        <canvas ref="expenseChart"></canvas>
        
        <!-- 支出类别列表 -->
        <div class="category-list">
          <div v-for="(item, index) in expenseChartData" :key="index" class="category-item">
            <div class="category-color" :style="{ backgroundColor: expenseChartColors[index % expenseChartColors.length] }"></div>
            <div class="category-name">{{ item.label }}</div>
            <div class="category-value">¥{{ item.value.toFixed(2) }}</div>
            <div class="category-percent">{{ (item.value / totalExpense * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>

      <!-- 收入分析饼图 -->
      <div v-if="activeTab === 'income'" class="pie-chart">
        <canvas ref="incomeChart"></canvas>
        
        <!-- 收入类别列表 -->
        <div class="category-list">
          <div v-for="(item, index) in incomeChartData" :key="index" class="category-item">
            <div class="category-color" :style="{ backgroundColor: incomeChartColors[index % incomeChartColors.length] }"></div>
            <div class="category-name">{{ item.label }}</div>
            <div class="category-value">¥{{ item.value.toFixed(2) }}</div>
            <div class="category-percent">{{ (item.value / totalIncome * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>      <!-- 收支趋势折线图 -->
      <div v-if="activeTab === 'trend'" class="trend-chart">
        <canvas ref="trendChart"></canvas>
        
        <!-- 前5笔最高支出交易 -->
        <div class="top-transactions-section" v-if="topExpenseTransactions.length > 0">
          <h3 class="top-transactions-title expense">前5笔最高支出</h3>
          <div class="top-transactions-list">
            <div v-for="(item, index) in topExpenseTransactions" :key="'expense-'+index" class="top-transaction-item">
              <div class="transaction-info">
                <div class="transaction-name">{{ item.specific_name }}</div>
                <div class="transaction-category">{{ item.category }}</div>
              </div>
              <div class="transaction-bar-container">
                <div class="transaction-bar expense" :style="{ width: (item.amount / topExpenseTransactions[0].amount * 100) + '%' }"></div>
              </div>
              <div class="transaction-amount expense">-¥{{ item.amount.toFixed(2) }}</div>
            </div>
          </div>
        </div>
        
        <!-- 前5笔最高收入交易 -->
        <div class="top-transactions-section" v-if="topIncomeTransactions.length > 0">
          <h3 class="top-transactions-title income">前5笔最高收入</h3>
          <div class="top-transactions-list">
            <div v-for="(item, index) in topIncomeTransactions" :key="'income-'+index" class="top-transaction-item">
              <div class="transaction-info">
                <div class="transaction-name">{{ item.specific_name }}</div>
                <div class="transaction-category">{{ item.category }}</div>
              </div>
              <div class="transaction-bar-container">
                <div class="transaction-bar income" :style="{ width: (item.amount / topIncomeTransactions[0].amount * 100) + '%' }"></div>
              </div>
              <div class="transaction-amount income">+¥{{ item.amount.toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import ApiService from '../services/ApiService'

// 状态变量
const activeTab = ref('expense')
const showFilter = ref(false)
const filterTimeType = ref('month') // 默认按月
const filterExpense = ref([])
const filterIncome = ref([])
const isLoading = ref(false)
const error = ref(null)
const totalIncome = ref(0)
const totalExpense = ref(0)
const totalBalance = ref(0)

// 饼图数据
const expenseChartData = ref([])
const incomeChartData = ref([])
const trendChartData = ref({
  labels: [],
  incomeData: [],
  expenseData: []
})

// 前5笔最高金额交易数据
const topExpenseTransactions = ref([])
const topIncomeTransactions = ref([])

// 图表引用
const expenseChart = ref(null)
const incomeChart = ref(null)
const trendChart = ref(null)
let expenseChartInstance = null
let incomeChartInstance = null
let trendChartInstance = null

// 预定义的类别
const expenseCategories = [
  '餐饮', '购物', '交通', '住房', '娱乐', '教育', '医疗', '日用品', '其他支出'
]
const incomeCategories = [
  '工资', '奖金', '补贴', '兼职', '投资', '其他收入'
]

// 时间选项
const timeTypes = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' }
]

// 图表颜色
const expenseChartColors = [
  '#FFA726', '#42A5F5', '#66BB6A', 
  '#EC407A', '#AB47BC', '#26A69A', 
  '#5C6BC0', '#D4E157', '#7E57C2'
]
const incomeChartColors = [
  '#26A69A', '#5C6BC0', '#D4E157', 
  '#7E57C2', '#FFA726', '#42A5F5'
]

// 监听标签页切换
watch(activeTab, () => {
  nextTick(() => {
    renderCharts()
  })
})

// 监听时间筛选变化
watch(filterTimeType, () => {
  fetchFilteredData()
})

// 组件挂载时获取数据
onMounted(() => {
  // 初始化筛选状态为全选
  filterExpense.value = [...expenseCategories];
  filterIncome.value = [...incomeCategories];

  fetchFilteredData()
})

// 关闭筛选面板
const closeFilter = () => {
  showFilter.value = false
}

// 应用筛选
const applyFilter = () => {
  fetchFilteredData()
  closeFilter()
}

// 重置筛选
const resetFilter = () => {
  filterExpense.value = [...expenseCategories]
  filterIncome.value = [...incomeCategories]
}

// 切换类别选择
const toggleCategory = (type, category) => {
  if (type === 'expense') {
    const index = filterExpense.value.indexOf(category)
    if (index === -1) {
      filterExpense.value.push(category)
    } else {
      filterExpense.value.splice(index, 1)
    }
  } else {
    const index = filterIncome.value.indexOf(category)
    if (index === -1) {
      filterIncome.value.push(category)
    } else {
      filterIncome.value.splice(index, 1)
    }
  }
}  // 处理获取前5笔最高金额交易
const processTopTransactions = async (startDateStr, endDateStr) => {
    // 获取所有交易记录
    const transactions = await ApiService.getFilteredTransactionList({
      startDateStr,
      endDateStr,
      incomeExpenseType: "all",
      categories: [...filterExpense.value, ...filterIncome.value]
    })
    
    // 区分收入和支出
    const incomeTransactions = transactions
      .filter(t => t.type === 'income')
      .map(t => ({
        ...t,
        amount: Math.abs(parseFloat(t.amount || 0)),
        specific_name: t.specific_name || t.category
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    
    const expenseTransactions = transactions
      .filter(t => t.type === 'expense')
      .map(t => ({
        ...t,
        amount: Math.abs(parseFloat(t.amount || 0)),
        specific_name: t.specific_name || t.category
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    
    // 更新状态
    topIncomeTransactions.value = incomeTransactions
    topExpenseTransactions.value = expenseTransactions
  }

  // 获取筛选的日期范围
const getFilterDateRange = () => {
  const now = new Date()
  let startDate, endDate
    // 根据选择的时间类型计算日期范围
  if (filterTimeType.value === 'week') {
    // 从今天向前7天（包括今天）
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    startDate.setDate(startDate.getDate() - 6) // 向前推6天，加上今天共7天
    
    // 确保startDate和endDate都是完整的天（00:00:00到23:59:59），使用当地时区
    endDate.setHours(23, 59, 59, 999) // 设置为今天的最后一毫秒
    startDate.setHours(0, 0, 0, 0) // 设置为起始日的第一毫秒
  } else if (filterTimeType.value === 'month') {
    // 当月的第一天到最后一天
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    // 设置时间为当天的开始和结束
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
  } else if (filterTimeType.value === 'year') {
    // 当年的1月1日到12月31日
    startDate = new Date(now.getFullYear(), 0, 1)
    endDate = new Date(now.getFullYear(), 11, 31)
    
    // 设置时间为当天的开始和结束
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
  }
  
  // 使用本地日期格式，避免时区问题
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  
  return {
    startDate,
    endDate,
    startDateStr,
    endDateStr,
    timeUnit: filterTimeType.value
  }
}

// 获取根据筛选条件的数据
const fetchFilteredData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // 获取日期范围
    const { startDateStr, endDateStr } = getFilterDateRange()
    
    // 构造查询参数
    const chartFilters = {
      startDateStr,
      endDateStr,
      timeUnit: filterTimeType.value,
      expenseCategories: filterExpense.value.length > 0 ? filterExpense.value : [],
      incomeCategories: filterIncome.value.length > 0 ? filterIncome.value : []
    }
    
    // 使用新的图表数据API
    const chartData = await ApiService.getChartData(chartFilters)
    
    // 更新总计数据
    totalIncome.value = chartData.summaryStats.total_income || 0
    totalExpense.value = chartData.summaryStats.total_expense || 0
    totalBalance.value = chartData.summaryStats.net_income || 0
    
    // 处理饼图数据
    expenseChartData.value = chartData.expenseCategoryDistribution.map(item => ({
      label: item.category,
      value: item.amount
    })).sort((a, b) => b.value - a.value)
    
    incomeChartData.value = chartData.incomeCategoryDistribution.map(item => ({
      label: item.category,
      value: item.amount
    })).sort((a, b) => b.value - a.value)
    
    // 处理趋势图数据
    if (filterTimeType.value === 'week') {
      // 对于周视图，确保显示完整的7天数据（包括今天）
      const { startDate, endDate } = getFilterDateRange();
        // 创建一个包含所有7天日期的数组
      const allDays = [];
      const dayLabels = [];
      const incomeData = [];
      const expenseData = [];
      
      // 生成从startDate到endDate的每一天
      for (let d = new Date(startDate.getTime()); d <= endDate; d.setDate(d.getDate() + 1)) {
        // 使用本地时区格式化日期字符串
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const label = `${month}/${day} ${weekdays[d.getDay()]}`;
        
        // 添加日期和标签
        allDays.push(dateStr);
        dayLabels.push(label);
        
        // 默认值为0，如果找到数据会被覆盖
        incomeData.push(0);
        expenseData.push(0);
      }
        // 将API返回的数据映射到对应的日期
      chartData.trendData.forEach(item => {
        if (item.date) {
          const dateStr = item.date;
          // 标准化日期格式以确保匹配，处理可能的时区差异
          const itemDate = new Date(item.date);
          const formattedDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
          
          const index = allDays.findIndex(day => day === formattedDateStr);
          if (index !== -1) {
            incomeData[index] = item.income || 0;
            expenseData[index] = item.expense || 0;
          }
        }
      });
      
      // 更新趋势图数据
      trendChartData.value = {
        labels: dayLabels,
        incomeData: incomeData,
        expenseData: expenseData
      };
    } else {
      // 月视图和年视图保持原来的处理逻辑
      trendChartData.value = {
        labels: chartData.trendData.map(item => {
          if (filterTimeType.value === 'month') {
            return (item.day || '') + '日';
          } else if (filterTimeType.value === 'year') {
            return item.month_of_year || '';
          } else {
            return formatChartDateLabel(item.date);
          }
        }),
        incomeData: chartData.trendData.map(item => item.income || 0),
        expenseData: chartData.trendData.map(item => item.expense || 0)
      };
    }
      // 获取前5笔最高金额交易
    await processTopTransactions(startDateStr, endDateStr)
    
    // 渲染图表
    nextTick(() => {
      renderCharts()
    })
    
  } catch (err) {
    console.error('获取数据失败:', err)
    error.value = '加载数据失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 格式化日期为更友好的显示格式
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 格式化图表日期标签
const formatChartDateLabel = (dateStr) => {
  if (!dateStr) return ''
  
  // 根据时间范围的不同，返回不同格式的日期标签
  if (filterTimeType.value === 'week') {
    // 周视图显示日期和星期，如"5/1 周一"
    const date = new Date(dateStr)
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day} ${weekdays[date.getDay()]}`
  } else if (filterTimeType.value === 'month') {
    // 月视图显示 "1日" 到 "31日"
    try {
      // 如果是完整日期，取出日
      if (dateStr.includes('-')) {
        return dateStr.split('-')[2] + '日'
      } 
      // 如果已经是数字，直接添加"日"
      return dateStr + '日'
    } catch (e) {
      console.error('日期格式化错误:', e)
      return dateStr
    }
  } else {
    // 年视图显示 "1月" 到 "12月"
    try {
      // 如果是完整日期，取出月
      if (dateStr.includes('-')) {
        const month = parseInt(dateStr.split('-')[1])
        return month + '月'
      }
      // 如果已经是数字，直接添加"月"
      return dateStr + '月'
    } catch (e) {
      console.error('日期格式化错误:', e)
      return dateStr
    }
  }
}

// 渲染图表
const renderCharts = () => {
  if (activeTab.value === 'expense') {
    renderExpenseChart()
  } else if (activeTab.value === 'income') {
    renderIncomeChart()
  } else if (activeTab.value === 'trend') {
    renderTrendChart()
  }
}

// 渲染支出图表
const renderExpenseChart = () => {
  if (expenseChartInstance) {
    expenseChartInstance.destroy()
  }
  
  const ctx = expenseChart.value.getContext('2d')
  expenseChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: expenseChartData.value.map(item => item.label),
      datasets: [{
        data: expenseChartData.value.map(item => item.value),
        backgroundColor: expenseChartColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${context.label}: ¥${value.toFixed(2)} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

// 渲染收入图表
const renderIncomeChart = () => {
  if (incomeChartInstance) {
    incomeChartInstance.destroy()
  }
  
  const ctx = incomeChart.value.getContext('2d')
  incomeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: incomeChartData.value.map(item => item.label),
      datasets: [{
        data: incomeChartData.value.map(item => item.value),
        backgroundColor: incomeChartColors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${context.label}: ¥${value.toFixed(2)} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

// 渲染趋势图表
const renderTrendChart = () => {
  if (trendChartInstance) {
    trendChartInstance.destroy()
  }
  
  const ctx = trendChart.value.getContext('2d')
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendChartData.value.labels,
      datasets: [
        {
          label: '收入',
          data: trendChartData.value.incomeData,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: '支出',
          data: trendChartData.value.expenseData,
          borderColor: '#F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '¥' + value
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ¥${context.parsed.y.toFixed(2)}`
            }
          }
        }
      }
    }
  })
}

// 获取类别图标
const getCategoryIcon = (category) => {
  const icons = {
    '餐饮': '🍽️',
    '购物': '🛒',
    '交通': '🚗',
    '住房': '🏠',
    '娱乐': '🎮',
    '教育': '📚',
    '医疗': '💊',
    '日用品': '🧴',
    '工资': '💰',
    '奖金': '🏆',
    '补贴': '💸',
    '兼职': '💼',
    '投资': '📈',
    '其他收入': '💵',
    '其他支出': '💸',
    '其他': '📝'
  }
  
  return icons[category] || '📝'
}
</script>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh);
  background-color: #f5f5f5;
  padding-bottom: 50px; /* 增加滚动页面的下沿空白部分，避免按钮被压缩 */
  position: relative;
}

/* 筛选按钮 */
.filter-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  padding: 8px 12px;
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-icon {
  margin-right: 4px;
}

/* 筛选弹窗 */
.filter-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.filter-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
}

.filter-panel {
  position: relative;
  width: 100%;
  max-height: 80vh;
  background-color: white;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  z-index: 1001;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
  padding-bottom: 80px; /* 给底部按钮留出空间 */
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.filter-title {
  text-align: center;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
}

.filter-time-btn {
  padding: 8px 16px;
  margin-right: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  background-color: #f5f5f5;
  font-size: 14px;
  cursor: pointer;
}

.filter-time-btn.active {
  background-color: #0084ff;
  color: white;
  border-color: #0084ff;
}

.filter-category-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.filter-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background-color: #f9f9f9;
  cursor: pointer;
}

.filter-category.selected {
  background-color: #e3f2fd;
  border-color: #0084ff;
}

.cat-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.cat-name {
  font-size: 13px;
}


.filter-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  background: white;
  padding: 0 0 0 0;
  box-shadow: none;
  z-index: 1;
}

.reset-btn, .confirm-btn {
  flex: 1;
  padding: 14px 0;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  min-width: 0;
}

.reset-btn {
  background-color: white;
  border: 1px solid #e0e0e0;
  margin-right: 10px;
}

.confirm-btn {
  background-color: #0084ff;
  color: white;
  border: none;
}

/* 收支概览卡片 */
.overview-card {
  margin: 16px;
  display: flex;
  justify-content: space-between;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.overview-item {
  flex: 1;
  padding: 16px;
  text-align: center;
}

.overview-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.overview-amount {
  font-size: 18px;
  font-weight: bold;
}

.overview-amount.income {
  color: #4CAF50;
}

.overview-amount.expense {
  color: #F44336;
}

.divider {
  width: 1px;
  background-color: #f0f0f0;
}

/* 图表标签页 */
.chart-tabs {
  display: flex;
  background-color: white;
  margin: 0 16px 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.chart-tab {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.chart-tab.active {
  color: #0084ff;
  font-weight: bold;
  border-bottom: 2px solid #0084ff;
}

/* 图表区域 */
.chart-area {
  flex: 1;
  overflow-y: auto;
  margin: 0 16px 16px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 16px;
}

.pie-chart {
  max-width: 100%;
}

.pie-chart canvas {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  display: block;
}

.trend-chart {
  width: 100%;
  height: 250px;
}

/* 类别列表 */
.category-list {
  margin-top: 20px;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f9f9f9;
}

.category-color {
  width: 12px;
  height: 12px;
  border-radius: 6px;
  margin-right: 10px;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.category-value {
  margin-right: 8px;
  font-weight: bold;
  font-size: 14px;
}

.category-percent {
  min-width: 45px;
  text-align: right;
  color: #666;
  font-size: 13px;
}

/* 前5笔交易样式 */
.top-transactions-section {
  margin-top: 30px;
  border-top: 1px solid #f0f0f0;
  padding-top: 20px;
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
  color: #666;
}

.transaction-bar-container {
  flex: 1;
  height: 12px;
  background-color: #f0f0f0;
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
  background-color: #F44336;
}

.transaction-bar.income {
  background-color: #4CAF50;
}

.transaction-amount {
  min-width: 90px;
  text-align: right;
  font-weight: bold;
  font-size: 14px;
}

.transaction-amount.expense {
  color: #F44336;
}

.transaction-amount.income {
  color: #4CAF50;
}
</style>
