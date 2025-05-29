<template>
  <div class="details-container">
    <!-- 顶部月份导航 -->
    <div class="month-navigation">
      <button class="nav-button" @click="changeMonth(-1)">
        <span>&lt;</span>
      </button>
      <span class="current-month">{{ currentYear }}-{{ String(currentMonth).padStart(2, '0') }}</span>
      <button class="nav-button" @click="changeMonth(1)">
        <span>&gt;</span>
      </button>
    </div>

    <!-- 黄色月度汇总卡片 -->
    <div class="summary-card">
      <div class="month-expense-label">本月支出(元)</div>
      <div class="month-expense-amount">¥ {{ summary.expense.toFixed(2) }}</div>
      
      <div class="summary-details">
        <div class="income-column">
          <div class="detail-label">本月收入</div>
          <div class="detail-amount">{{ summary.income.toFixed(2) }}</div>
        </div>
        <div class="balance-column">
          <div class="detail-label">月结余</div>
          <div class="detail-amount" :class="{ 'negative': summary.balance < 0 }">
            {{ summary.balance.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 日期分组的明细列表 -->
    <div class="entries-list">
      <!-- 加载中提示 -->
      <div v-if="isLoading" class="loading-state">
        <span>加载中...</span>
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="fetchMonthlyData" class="retry-btn">重试</button>
      </div>
      
      <!-- 正常数据显示 -->
      <template v-else>
        <div v-for="group in entries" :key="group.date" class="day-group-card">
          <!-- 日期头部 -->
          <div class="day-header">
            <div class="day-info">
              <span class="date">{{ formatDateHeader(group.date, group.isToday, group.weekday) }}</span>
            </div>
            <div class="day-summary">
              <span class="income" v-if="group.income > 0">收入: ¥{{ group.income.toFixed(2) }}</span>
              <span class="expense" v-if="group.expense > 0">支出: ¥{{ group.expense.toFixed(2) }}</span>
            </div>
          </div>

          <!-- 该日期的明细条目 -->
          <div class="entry-list">
            <div v-for="entry in group.entries" :key="entry.id" class="entry-item">
              <div class="entry-icon" :class="getCategoryClass(entry.category)">
                {{ getCategoryIcon(entry.category) }}
              </div>
              <div class="entry-info">
                <div class="entry-category">{{ entry.category }}</div>
                <div class="entry-description">{{ entry.specific_name || '无描述' }}</div>
              </div>
              <div class="entry-amount" :class="{ 'income': entry.type === 'income' }">
                {{ entry.type === 'income' ? '+' : '-' }}¥{{ Math.abs(parseFloat(entry.amount)).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 没有数据时的占位符 -->
        <div v-if="entries.length === 0" class="no-data">
          <p>本月暂无交易记录</p>
          <p>开始记录你的第一笔交易吧</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ApiService from '../services/ApiService'

// 状态变量
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const summary = ref({
  expense: 0,
  income: 0,
  balance: 0
})
const entries = ref([])
const isLoading = ref(false)
const error = ref(null)

// 周几的中文表示
const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 监听年月变化，重新获取数据
watch([currentYear, currentMonth], () => {
  fetchMonthlyData()
})

// 组件挂载时获取数据
onMounted(() => {
  fetchMonthlyData()
})

// 切换月份
const changeMonth = (step) => {
  let newMonth = currentMonth.value + step
  let newYear = currentYear.value

  if (newMonth > 12) {
    newMonth = 1
    newYear += 1
  } else if (newMonth < 1) {
    newMonth = 12
    newYear -= 1
  }

  currentMonth.value = newMonth
  currentYear.value = newYear
}

// 获取月度数据
const fetchMonthlyData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    // 设置查询的开始日期和结束日期
    const startDate = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`
    
    // 计算月的最后一天
    const lastDay = new Date(currentYear.value, currentMonth.value, 0).getDate()
    const endDate = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${lastDay}`
    
    // 查询交易列表
    const transactions = await ApiService.getFilteredTransactionList({
      startDateStr: startDate,
      endDateStr: endDate
    })
    
    // 查询汇总数据
    const summaryData = await ApiService.getSummaryStatistics({
      startDateStr: startDate,
      endDateStr: endDate
    })
    
    // 更新汇总信息
    summary.value = {
      expense: summaryData.total_expense || 0,
      income: summaryData.total_income || 0,
      balance: (summaryData.total_income || 0) - (summaryData.total_expense || 0)
    }
    
    // 按日期分组交易
    const groupedEntries = groupEntriesByDate(transactions)
    entries.value = groupedEntries
    
  } catch (err) {
    console.error('获取数据失败:', err)
    error.value = '加载数据失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 按日期分组交易
const groupEntriesByDate = (transactions) => {
  const groups = {}
  const today = new Date().toISOString().split('T')[0]
  
  // 按日期分组
  for (const transaction of transactions) {
    // 提取日期部分
    const dateTime = transaction.datetime
    const date = dateTime.split(' ')[0]
    
    if (!groups[date]) {
      // 计算星期几
      const dateParts = date.split('-').map(p => parseInt(p))
      const jsDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
      const weekday = weekdayNames[jsDate.getDay()]
      
      groups[date] = {
        date,
        weekday,
        isToday: date === today,
        income: 0,
        expense: 0,
        entries: []
      }
    }
    
    // 添加交易到对应日期组
    groups[date].entries.push(transaction)
    
    // 累计收入或支出
    const amount = parseFloat(transaction.amount)
    if (transaction.type === 'income') {
      groups[date].income += amount
    } else {
      groups[date].expense += Math.abs(amount)
    }
  }
  
  // 转换为数组并按日期排序（从新到旧）
  return Object.values(groups).sort((a, b) => {
    return new Date(b.date) - new Date(a.date)
  })
}

// 格式化日期头部显示
const formatDateHeader = (date, isToday, weekday) => {
  if (isToday) return `今天 (${weekday})`
  
  // 提取月和日
  const [year, month, day] = date.split('-')
  return `${month}月${day}日 (${weekday})`
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

// 获取类别样式类名
const getCategoryClass = (category) => {
  return 'category-' + (category || '其他').toLowerCase().replace(/\s+/g, '-')
}
</script>

<style scoped>
.details-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px); /* 减去导航栏高度 */
  background-color: #f5f5f5;
  padding-bottom: 50px; /* 为底部导航栏留出空间 */
}

/* 月份导航 */
.month-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.nav-button {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background-color: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
}

.current-month {
  font-size: 16px;
  font-weight: bold;
}

/* 汇总卡片 */
.summary-card {
  margin: 16px;
  padding: 16px;
  background-color: #FFC107;
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.month-expense-label {
  font-size: 14px;
  opacity: 0.9;
}

.month-expense-amount {
  font-size: 28px;
  font-weight: bold;
  margin: 8px 0;
}

.summary-details {
  display: flex;
  margin-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.3);
  padding-top: 12px;
}

.income-column, .balance-column {
  flex: 1;
}

.detail-label {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.detail-amount {
  font-weight: bold;
  font-size: 16px;
}

.detail-amount.negative {
  color: #FF5252;
}

/* 明细列表 */
.entries-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.day-group-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.day-header {
  padding: 12px 16px;
  background-color: #f9f9f9;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
}

.date {
  font-weight: bold;
}

.day-summary {
  font-size: 13px;
}

.day-summary .income {
  color: #4CAF50;
  margin-right: 8px;
}

.day-summary .expense {
  color: #F44336;
}

.entry-list {
  padding: 0;
}

.entry-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.entry-item:last-child {
  border-bottom: none;
}

.entry-icon {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
}

.entry-info {
  flex: 1;
}

.entry-category {
  font-weight: bold;
  margin-bottom: 4px;
}

.entry-description {
  font-size: 13px;
  color: #666;
}

.entry-amount {
  font-weight: bold;
  color: #F44336;
}

.entry-amount.income {
  color: #4CAF50;
}

/* 加载和错误状态 */
.loading-state, .error-state, .no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: #666;
  text-align: center;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #0084ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.no-data {
  color: #999;
  line-height: 1.5;
}
</style>
