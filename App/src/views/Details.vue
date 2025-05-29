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
                {{ entry.type === 'income' ? '+' : '-' }}¥{{ entry.amount.toFixed(2) }}
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

<script>
import axios from 'axios'

export default {
  name: 'Details',
  data() {
    return {
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      summary: {
        expense: 0,
        income: 0,
        balance: 0
      },
      entries: [],
      apiBaseUrl: 'http://localhost:5000',
      isLoading: false,
      error: null
    }
  },
  mounted() {
    this.fetchMonthlyData()
  },
  methods: {
    // 切换月份
    changeMonth(delta) {
      let newMonth = this.currentMonth + delta
      if (newMonth > 12) {
        this.currentMonth = 1
        this.currentYear++
      } else if (newMonth < 1) {
        this.currentMonth = 12
        this.currentYear--
      } else {
        this.currentMonth = newMonth
      }
      
      this.fetchMonthlyData()
    },
    
    // 获取月度数据
    async fetchMonthlyData() {
      this.isLoading = true
      this.error = null
      // 调试输出请求URL和参数
      const startDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`
      const lastDay = new Date(this.currentYear, this.currentMonth, 0).getDate()
      const endDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${lastDay}`
      console.log('请求URL:', `${this.apiBaseUrl}/get_transaction_list_for_frontend`)
      console.log('请求参数:', {
        start_date: startDate,
        end_date: endDate,
        transaction_type: 'all'
      })
      
      try {
        // 调用后端API获取数据
        const response = await axios.get(`${this.apiBaseUrl}/get_transaction_list_for_frontend`, {
          params: {
            start_date: startDate,
            end_date: endDate,
            transaction_type: 'all'
          }
        })
        
        if (response.data.error) {
          throw new Error(response.data.error)
        }
        
        // 更新汇总数据
        this.summary = {
          income: response.data.summary.total_income,
          expense: response.data.summary.total_expense,
          balance: response.data.summary.net_income
        }
        
        // 处理交易记录，按日期分组
        const groupedEntries = this.groupEntriesByDate(response.data.transactions)
        this.entries = groupedEntries
        
      } catch (error) {
        console.error('获取月度数据失败:', error)
        this.error = '获取数据失败，请刷新重试'
      } finally {
        this.isLoading = false
      }
    },
    
    // 按日期分组交易记录
    groupEntriesByDate(transactions) {
      const groups = {}
      
      transactions.forEach(transaction => {
        const date = transaction.date
        if (!groups[date]) {
          groups[date] = {
            date: date,
            isToday: this.isToday(date),
            weekday: this.getWeekday(date),
            income: 0,
            expense: 0,
            entries: []
          }
        }
        
        // 更新日汇总
        if (transaction.type === 'income') {
          groups[date].income += transaction.amount
        } else {
          groups[date].expense += transaction.amount
        }
        
        // 添加交易记录
        groups[date].entries.push(transaction)
      })
      
      // 转换为数组并排序
      return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
    },
    
    // 判断是否是今天
    isToday(dateStr) {
      const today = new Date()
      const date = new Date(dateStr)
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear()
    },
    
    // 获取星期几
    getWeekday(dateStr) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const date = new Date(dateStr)
      return weekdays[date.getDay()]
    },
    
    // 格式化日期头部显示（05月15日 周四 或 今天周五）
    formatDateHeader(dateStr, isToday, weekday) {
      if (isToday) {
        return `今天${weekday}`
      }
      
      const dateParts = dateStr.split('-')
      const month = dateParts[1]
      const day = dateParts[2]
      
      return `${month}月${day}日 ${weekday}`
    },
    
    // 获取分类图标
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
    
    // 获取分类样式类名
    getCategoryClass(category) {
      let baseClass = 'category-'
      
      const categoryMapping = {
        // 收入类
        '工资': 'salary',
        '奖金': 'bonus',
        '补贴': 'subsidy',
        '兼职': 'parttime',
        '投资': 'investment',
        '其他收入': 'other-income',
        
        // 支出类
        '餐饮': 'food',
        '购物': 'shopping',
        '交通': 'transport',
        '住房': 'housing',
        '娱乐': 'entertainment',
        '教育': 'education',
        '医疗': 'medical',
        '日用品': 'daily',
        '其他支出': 'other-expense'
      }
      
      return baseClass + (categoryMapping[category] || 'other')
    }
  }
}
</script>

<style scoped>
.details-container {
  background-color: transparent;
  min-height: 100vh;
  height: 100%;
  box-sizing: border-box;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 月份导航 */
.month-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 25px;
  width: 100%;
  max-width: 400px;
}

.current-month {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 20px;
}

.nav-button {
  background: none;
  border: none;
  color: #666;
  font-size: 24px;
  cursor: pointer;
  padding: 5px 15px;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.nav-button:hover {
  background-color: #f5f5f5;
}

/* 月度汇总卡片 */
.summary-card {
  background-color: #FFD700;
  border-radius: 15px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  margin-bottom: 25px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.month-expense-label {
  font-size: 16px;
  color: #666;
  margin-bottom: 5px;
}

.month-expense-amount {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.summary-details {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 15px;
}

.income-column, .balance-column {
  text-align: center;
}

.detail-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.detail-amount {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.detail-amount.negative {
  color: #ff4d4f;
}

/* 明细列表 */
.entries-list {
  width: 100%;
  max-width: 400px;
}

.day-group-card {
  background: white;
  border-radius: 12px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.day-info {
  display: flex;
  align-items: center;
}

.date {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.day-summary {
  font-size: 14px;
  color: #666;
}

.day-summary .income {
  color: #67C23A;
  margin-right: 10px;
}

.day-summary .expense {
  color: #F56C6C;
}

/* 明细条目 */
.entry-list {
  padding: 10px 15px;
}

.entry-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.entry-item:last-child {
  border-bottom: none;
}

.entry-icon {
  width: 40px;
  height: 40px;
  border-radius: 20px;
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
  font-size: 15px;
  color: #333;
  margin-bottom: 4px;
}

.entry-description {
  font-size: 13px;
  color: #999;
}

.entry-amount {
  font-size: 16px;
  font-weight: 500;
  color: #F56C6C;
}

.entry-amount.income {
  color: #67C23A;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 20px;
  color: #F56C6C;
}

.retry-btn {
  margin-top: 10px;
  padding: 8px 20px;
  background-color: #409EFF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-btn:hover {
  background-color: #66b1ff;
}

/* 无数据状态 */
.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.no-data p:first-child {
  font-size: 16px;
  margin-bottom: 10px;
}

.no-data p:last-child {
  font-size: 14px;
  color: #C0C4CC;
}

/* 分类样式 */
.category-salary { background-color: #E6F7FF; }
.category-bonus { background-color: #F6FFED; }
.category-subsidy { background-color: #FFF7E6; }
.category-parttime { background-color: #F9F0FF; }
.category-investment { background-color: #FFF1F0; }
.category-other-income { background-color: #F5F5F5; }

.category-food { background-color: #FFF1F0; }
.category-shopping { background-color: #F6FFED; }
.category-transport { background-color: #E6F7FF; }
.category-housing { background-color: #FFF7E6; }
.category-entertainment { background-color: #F9F0FF; }
.category-education { background-color: #F5F5F5; }
.category-medical { background-color: #FFF1F0; }
.category-daily { background-color: #F6FFED; }
.category-other-expense { background-color: #F5F5F5; }
</style>