import Vue from 'vue'
import Chart from '@/views/Chart'

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn()
}))

const axios = require('axios')

describe('Chart.vue', () => {
  let wrapper

  beforeEach(() => {
    // Reset axios mock
    axios.post.mockReset()
    
    const Constructor = Vue.extend(Chart)
    wrapper = new Constructor().$mount()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.$destroy()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.$el.classList.contains('chart-container')).toBe(true)
    })

    it('应该渲染筛选按钮', () => {
      const filterBtn = wrapper.$el.querySelector('.filter-btn')
      expect(filterBtn).toBeTruthy()
      expect(filterBtn.textContent).toContain('筛选')
    })

    it('应该渲染收支概览卡片', () => {
      const overviewCard = wrapper.$el.querySelector('.overview-card')
      expect(overviewCard).toBeTruthy()
      
      const overviewItems = wrapper.$el.querySelectorAll('.overview-item')
      expect(overviewItems.length).toBe(3) // 收入、支出、结余
    })

    it('应该渲染图表切换标签', () => {
      const chartTabs = wrapper.$el.querySelector('.chart-tabs')
      expect(chartTabs).toBeTruthy()
      
      const tabs = wrapper.$el.querySelectorAll('.chart-tab')
      expect(tabs.length).toBe(3) // 支出分析、收入分析、收支趋势
    })
  })

  describe('数据初始化测试', () => {
    it('应该正确初始化数据', () => {
      expect(wrapper.$data.showFilter).toBe(false)
      expect(wrapper.$data.activeTab).toBe('trend')
      expect(wrapper.$data.filterTimeType).toBe('week')
      expect(Array.isArray(wrapper.$data.expenseCategories)).toBe(true)
      expect(Array.isArray(wrapper.$data.incomeCategories)).toBe(true)
      expect(wrapper.$data.summary.income).toBe(0)
      expect(wrapper.$data.summary.expense).toBe(0)
      expect(wrapper.$data.summary.balance).toBe(0)
    })

    it('应该包含正确的时间类型选项', () => {
      const timeTypes = wrapper.$data.timeTypes
      expect(timeTypes.length).toBe(3)
      expect(timeTypes.find(t => t.value === 'week')).toBeTruthy()
      expect(timeTypes.find(t => t.value === 'month')).toBeTruthy()
      expect(timeTypes.find(t => t.value === 'year')).toBeTruthy()
    })

    it('应该包含正确的支出类别', () => {
      const expenseCategories = wrapper.$data.expenseCategories
      expect(expenseCategories).toContain('餐饮')
      expect(expenseCategories).toContain('交通')
      expect(expenseCategories).toContain('住房')
      expect(expenseCategories).toContain('购物')
    })

    it('应该包含正确的收入类别', () => {
      const incomeCategories = wrapper.$data.incomeCategories
      expect(incomeCategories).toContain('工资')
      expect(incomeCategories).toContain('奖金')
      expect(incomeCategories).toContain('投资')
      expect(incomeCategories).toContain('兼职')
    })
  })

  describe('计算属性测试', () => {
    it('totalIncome应该返回正确的总收入', () => {
      wrapper.$data.summary.income = 5000
      expect(wrapper.totalIncome).toBe(5000)
    })

    it('totalExpense应该返回正确的总支出', () => {
      wrapper.$data.summary.expense = 3000
      expect(wrapper.totalExpense).toBe(3000)
    })

    it('totalBalance应该返回正确的余额', () => {
      wrapper.$data.summary.balance = 2000
      expect(wrapper.totalBalance).toBe(2000)
    })
  })

  describe('getCategoryIcon方法测试', () => {
    it('应该返回正确的类别图标', () => {
      expect(wrapper.getCategoryIcon('餐饮')).toBe('🍔')
      expect(wrapper.getCategoryIcon('交通')).toBe('🚗')
      expect(wrapper.getCategoryIcon('工资')).toBe('💰')
      expect(wrapper.getCategoryIcon('住房')).toBe('🏠')
      expect(wrapper.getCategoryIcon('投资')).toBe('📈')
    })

    it('应该为未知类别返回默认图标', () => {
      expect(wrapper.getCategoryIcon('未知类别')).toBe('📝')
      expect(wrapper.getCategoryIcon('')).toBe('📝')
      expect(wrapper.getCategoryIcon(null)).toBe('📝')
    })
  })

  describe('筛选功能测试', () => {
    it('点击筛选按钮应该显示筛选面板', async () => {
      const filterBtn = wrapper.$el.querySelector('.filter-btn')
      filterBtn.click()
      await wrapper.$nextTick()
      
      expect(wrapper.$data.showFilter).toBe(true)
      const filterModal = wrapper.$el.querySelector('.filter-modal')
      expect(filterModal).toBeTruthy()
    })

    it('toggleCategory方法应该正确切换类别选择', () => {
      const initialExpenseCount = wrapper.$data.filterExpense.length
      wrapper.toggleCategory('expense', '餐饮')
      expect(wrapper.$data.filterExpense.length).toBe(initialExpenseCount - 1)
      
      wrapper.toggleCategory('expense', '餐饮')
      expect(wrapper.$data.filterExpense.length).toBe(initialExpenseCount)
    })

    it('resetFilter方法应该重置筛选条件', () => {
      wrapper.$data.filterTimeType = 'month'
      wrapper.$data.filterExpense = ['餐饮']
      wrapper.$data.filterIncome = ['工资']
      
      wrapper.resetFilter()
      
      expect(wrapper.$data.filterTimeType).toBe('week')
      expect(wrapper.$data.filterExpense.length).toBe(wrapper.$data.expenseCategories.length)
      expect(wrapper.$data.filterIncome.length).toBe(wrapper.$data.incomeCategories.length)
    })

    it('closeFilter方法应该关闭筛选面板', () => {
      wrapper.$data.showFilter = true
      wrapper.closeFilter()
      expect(wrapper.$data.showFilter).toBe(false)
    })
  })

  describe('标签切换测试', () => {
    it('初始状态应该是趋势标签激活', () => {
      expect(wrapper.$data.activeTab).toBe('trend')
    })

    it('点击支出分析标签应该切换到支出视图', async () => {
      const expenseTab = wrapper.$el.querySelectorAll('.chart-tab')[0]
      expenseTab.click()
      await wrapper.$nextTick()
      
      expect(wrapper.$data.activeTab).toBe('expense')
    })

    it('点击收入分析标签应该切换到收入视图', async () => {
      const incomeTab = wrapper.$el.querySelectorAll('.chart-tab')[1]
      incomeTab.click()
      await wrapper.$nextTick()
      
      expect(wrapper.$data.activeTab).toBe('income')
    })
  })

  describe('API调用测试', () => {
    it('fetchChartData应该调用后端API', async () => {
      const mockResponse = {
        data: {
          summary_statistics: {
            total_income: 5000,
            total_expense: 3000,
            net_income: 2000
          },
          income_category_distribution: [],
          expense_category_distribution: [],
          daily_net_income_series: [],
          daily_income_series: [],
          daily_expense_series: []
        }
      }
      
      axios.post.mockResolvedValue(mockResponse)
      
      await wrapper.fetchChartData()
      
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/get_chart_data_from_filters', expect.any(Object))
      expect(wrapper.$data.summary.income).toBe(5000)
      expect(wrapper.$data.summary.expense).toBe(3000)
      expect(wrapper.$data.summary.balance).toBe(2000)
    })

    it('API调用失败应该设置错误状态', async () => {
      axios.post.mockRejectedValue(new Error('Network Error'))
      
      await wrapper.fetchChartData()
      
      expect(wrapper.$data.error).toBeTruthy()
      expect(wrapper.$data.isLoading).toBe(false)
    })
  })

  describe('月份切换测试', () => {
    it('changeMonth方法应该正确切换月份', () => {
      wrapper.$data.currentMonth = 6
      wrapper.$data.currentYear = 2024
      
      wrapper.changeMonth(1)
      expect(wrapper.$data.currentMonth).toBe(7)
      
      wrapper.changeMonth(-1)
      expect(wrapper.$data.currentMonth).toBe(6)
    })

    it('跨年月份切换应该正确处理', () => {
      wrapper.$data.currentMonth = 12
      wrapper.$data.currentYear = 2024
      
      wrapper.changeMonth(1)
      expect(wrapper.$data.currentMonth).toBe(1)
      expect(wrapper.$data.currentYear).toBe(2025)
      
      wrapper.changeMonth(-1)
      expect(wrapper.$data.currentMonth).toBe(12)
      expect(wrapper.$data.currentYear).toBe(2024)
    })
  })

  describe('概览卡片测试', () => {
    it('应该正确显示收入金额', () => {
      wrapper.$data.summary.income = 5000.56
      wrapper.$forceUpdate()
      
      const incomeAmount = wrapper.$el.querySelector('.overview-amount.income')
      expect(incomeAmount.textContent).toContain('5000.56')
    })

    it('应该正确显示支出金额', () => {
      wrapper.$data.summary.expense = 3000.25
      wrapper.$forceUpdate()
      
      const expenseAmount = wrapper.$el.querySelector('.overview-amount.expense')
      expect(expenseAmount.textContent).toContain('3000.25')
    })

    it('正余额应该显示收入样式', () => {
      wrapper.$data.summary.balance = 2000
      wrapper.$forceUpdate()
      
      const balanceAmount = wrapper.$el.querySelectorAll('.overview-amount')[2]
      expect(balanceAmount.classList.contains('income')).toBe(true)
    })

    it('负余额应该显示支出样式', () => {
      wrapper.$data.summary.balance = -1000
      wrapper.$forceUpdate()
      
      const balanceAmount = wrapper.$el.querySelectorAll('.overview-amount')[2]
      expect(balanceAmount.classList.contains('expense')).toBe(true)
    })
  })

  describe('生命周期测试', () => {
    it('组件挂载时应该调用fetchChartData', () => {
      const fetchSpy = jest.spyOn(Chart.methods, 'fetchChartData').mockImplementation(() => {})
      
      const Constructor = Vue.extend(Chart)
      const testWrapper = new Constructor().$mount()
      
      expect(fetchSpy).toHaveBeenCalled()
      
      fetchSpy.mockRestore()
      testWrapper.$destroy()
    })
  })
})
