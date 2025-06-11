import Vue from 'vue'
import { shallowMount, createLocalVue } from '@vue/test-utils'
import Chart from '@/views/Chart'

const localVue = createLocalVue()

// Mock axios
jest.mock('axios')
const axios = require('axios')

describe('Chart.vue - 图表分析页面测试', () => {
  let wrapper

  const mockApiResponse = {
    data: {
      summary_statistics: {
        total_income: 8000,
        total_expense: 6500,
        net_income: 1500
      },
      income_category_distribution: [
        { category: '工资', value: 5000 },
        { category: '奖金', value: 3000 }
      ],
      expense_category_distribution: [
        { category: '餐饮', value: 2000 },
        { category: '交通', value: 1500 },
        { category: '购物', value: 3000 }
      ],
      daily_net_income_series: [
        { day_of_week: '周一', value: 100 },
        { day_of_week: '周二', value: 200 }
      ],
      daily_income_series: [
        { day_of_week: '周一', value: 500, income: 500 },
        { day_of_week: '周二', value: 600, income: 600 }
      ],
      daily_expense_series: [
        { day_of_week: '周一', value: 400, expense: 400 },
        { day_of_week: '周二', value: 400, expense: 400 }
      ],
      filtered_income_transactions: [
        { amount: 500, category: '工资', specific_name: '月薪', datetime: '2023-01-01' }
      ],
      filtered_expense_transactions: [
        { amount: 300, category: '餐饮', specific_name: '午餐', datetime: '2023-01-01' }
      ]
    }
  }

  beforeEach(async () => {
    // Mock axios response
    axios.post.mockResolvedValue(mockApiResponse)
    
    wrapper = shallowMount(Chart, {
      localVue,
      data() {
        return {
          showFilter: false,
          filterTimeType: 'week',
          expenseCategories: ['餐饮','购物','交通','住房','娱乐','教育','医疗','日用品','其他支出'],
          incomeCategories: ['工资','奖金','补贴','兼职','投资','其他收入'],
          filterExpense: ['餐饮','购物','交通','住房','娱乐','教育','医疗','日用品','其他支出'],
          filterIncome: ['工资','奖金','补贴','兼职','投资','其他收入'],
          currentYear: new Date().getFullYear(),
          currentMonth: new Date().getMonth() + 1,
          activeTab: 'expense',
          summary: { income: 8000, expense: 6500, balance: 1500 },
          incomeCategoryData: [
            { category: '工资', value: 5000 },
            { category: '奖金', value: 3000 }
          ],
          expenseCategoryData: [
            { category: '餐饮', value: 2000 },
            { category: '交通', value: 1500 },
            { category: '购物', value: 3000 }
          ],
          trendData: [
            { day_of_week: '周一', value: 100 },
            { day_of_week: '周二', value: 200 }
          ],
          incomeTrendData: [],
          expenseTrendData: [],
          ledgerEntries: [],
          isLoading: false,
          error: null,
          topExpenseTransactions: [
            { specific_name: '大餐', amount: 500, category: '餐饮' }
          ],
          topIncomeTransactions: [
            { specific_name: '工资', amount: 5000, category: '工资' }
          ]
        }
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
    jest.clearAllMocks()
  })
  // 1. 基础渲染测试
  describe('基础渲染测试', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.is(Chart)).toBe(true)
    })

    it('应该包含图表容器', () => {
      expect(wrapper.find('.chart-container').exists()).toBe(true)
    })

    it('应该包含筛选按钮', () => {
      expect(wrapper.find('.filter-btn').exists()).toBe(true)
    })

    it('应该包含概览卡片', () => {
      expect(wrapper.find('.overview-card').exists()).toBe(true)
    })

    it('应该包含图表切换标签', () => {
      expect(wrapper.find('.chart-tabs').exists()).toBe(true)
    })

    it('应该正确显示汇总数据', () => {
      expect(wrapper.find('.overview-amount.income').text()).toContain('8000')
      expect(wrapper.find('.overview-amount.expense').text()).toContain('6500')
    })
  })

  // 2. 图表标签切换测试
  describe('图表标签切换测试', () => {
    it('应该正确切换到支出分析', async () => {
      const expenseTab = wrapper.find('.chart-tab')
      await expenseTab.trigger('click')
      
      expect(wrapper.vm.activeTab).toBe('expense')
      expect(wrapper.find('.pie-chart-container').exists()).toBe(true)
    })

    it('应该正确切换到收入分析', async () => {
      const tabs = wrapper.findAll('.chart-tab')
      const incomeTab = tabs.at(1)
      await incomeTab.trigger('click')
      
      expect(wrapper.vm.activeTab).toBe('income')
      expect(wrapper.find('.pie-chart-container').exists()).toBe(true)
    })

    it('应该正确切换到收支趋势', async () => {
      const tabs = wrapper.findAll('.chart-tab')
      const trendTab = tabs.at(2)
      await trendTab.trigger('click')
      
      expect(wrapper.vm.activeTab).toBe('trend')
      expect(wrapper.find('.trend-chart-container').exists()).toBe(true)
    })

    it('活动标签应该有正确的样式', () => {
      const activeTabs = wrapper.findAll('.chart-tab.active')
      expect(activeTabs.length).toBe(1)
    })
  })

  // 3. 筛选功能测试
  describe('筛选功能测试', () => {
    it('点击筛选按钮应该显示筛选弹窗', async () => {
      const filterBtn = wrapper.find('.filter-btn')
      await filterBtn.trigger('click')
      
      expect(wrapper.vm.showFilter).toBe(true)
    })

    it('应该正确设置时间维度', async () => {
      await wrapper.setData({ showFilter: true })
      
      const monthBtn = wrapper.find('.filter-time-btn')
      await monthBtn.trigger('click')
      
      expect(wrapper.vm.filterTimeType).toBeDefined()
    })

    it('应该包含所有支出类别', async () => {
      await wrapper.setData({ showFilter: true })
      
      const expenseCategories = wrapper.findAll('.filter-category')
      expect(expenseCategories.length).toBeGreaterThan(0)
    })

    it('应该支持类别选择切换', async () => {
      await wrapper.setData({ showFilter: true })
      
      const category = wrapper.find('.filter-category')
      if (category.exists()) {
        await category.trigger('click')
        expect(wrapper.vm.toggleCategory).toBeDefined()
      }
    })
  })

  // 4. 数据处理测试
  describe('数据处理测试', () => {
    it('应该正确获取分类数据', () => {
      const categoryData = wrapper.vm.getCategoryData()
      expect(Array.isArray(categoryData)).toBe(true)
      if (categoryData.length > 0) {
        expect(categoryData[0]).toHaveProperty('category')
        expect(categoryData[0]).toHaveProperty('amount')
        expect(categoryData[0]).toHaveProperty('percentage')
      }
    })

    it('应该正确计算总金额', () => {
      const totalAmount = wrapper.vm.getTotalAmount()
      expect(typeof totalAmount).toBe('string')
    })

    it('应该正确获取分类颜色', () => {
      const color = wrapper.vm.getCategoryColor('餐饮')
      expect(typeof color).toBe('string')
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('应该正确计算总收入', () => {
      expect(wrapper.vm.totalIncome).toBe(8000)
    })

    it('应该正确计算总支出', () => {
      expect(wrapper.vm.totalExpense).toBe(6500)
    })

    it('应该正确计算余额', () => {
      expect(wrapper.vm.totalBalance).toBe(1500)
    })
  })

  // 5. 趋势图数据测试
  describe('趋势图数据测试', () => {
    it('应该正确获取趋势X轴标签', () => {
      const labels = wrapper.vm.getTrendXAxisLabels()
      expect(Array.isArray(labels)).toBe(true)
    })

    it('应该正确获取趋势系列数据', () => {
      const netData = wrapper.vm.getTrendSeriesData('net')
      expect(Array.isArray(netData)).toBe(true)
      
      const incomeData = wrapper.vm.getTrendSeriesData('income')
      expect(Array.isArray(incomeData)).toBe(true)
      
      const expenseData = wrapper.vm.getTrendSeriesData('expense')
      expect(Array.isArray(expenseData)).toBe(true)
    })

    it('应该正确计算趋势图最大值', () => {
      const maxValue = wrapper.vm.getMaxTrendValue()
      expect(typeof maxValue).toBe('number')
      expect(maxValue).toBeGreaterThan(0)
    })

    it('应该正确生成折线图点坐标', () => {
      const points = wrapper.vm.getLinePoints('income')
      if (points) {
        expect(typeof points).toBe('string')
      }
    })

    it('应该正确生成折线图圆点坐标', () => {
      const dots = wrapper.vm.getLineDots('income')
      expect(Array.isArray(dots)).toBe(true)
    })
  })

  // 6. 饼图相关测试
  describe('饼图相关测试', () => {
    it('应该正确计算饼图dash array', () => {
      const dashArray = wrapper.vm.getPieDashArray(25)
      expect(typeof dashArray).toBe('string')
      expect(dashArray).toContain(' ')
    })

    it('应该正确计算饼图dash offset', () => {
      const offset = wrapper.vm.getPieDashOffset(0)
      expect(typeof offset).toBe('number')
    })

    it('切换到支出分析时应该显示饼图', async () => {
      await wrapper.setData({ activeTab: 'expense' })
      expect(wrapper.find('.pie-chart-container').exists()).toBe(true)
    })

    it('切换到收入分析时应该显示饼图', async () => {
      await wrapper.setData({ activeTab: 'income' })
      expect(wrapper.find('.pie-chart-container').exists()).toBe(true)
    })
  })

  // 7. 分类列表测试
  describe('分类列表测试', () => {
    it('应该显示分类列表', async () => {
      await wrapper.setData({ activeTab: 'expense' })
      const categoryList = wrapper.find('.category-list')
      expect(categoryList.exists()).toBe(true)
    })

    it('分类项应该包含正确的信息', async () => {
      await wrapper.setData({ activeTab: 'expense' })
      const categoryItems = wrapper.findAll('.category-item')
      if (categoryItems.length > 0) {
        const firstItem = categoryItems.at(0)
        expect(firstItem.find('.category-color').exists()).toBe(true)
        expect(firstItem.find('.category-name').exists()).toBe(true)
        expect(firstItem.find('.category-percent').exists()).toBe(true)
        expect(firstItem.find('.category-amount').exists()).toBe(true)
      }
    })
  })

  // 8. 前5笔交易测试
  describe('前5笔交易测试', () => {
    it('应该显示前5笔支出交易', async () => {
      await wrapper.setData({ activeTab: 'trend' })
      const expenseSection = wrapper.find('.top-transactions-section')
      if (expenseSection.exists()) {
        expect(expenseSection.find('.top-transactions-title.expense').exists()).toBe(true)
      }
    })

    it('交易项应该包含正确的信息', async () => {
      await wrapper.setData({ activeTab: 'trend' })
      const transactionItems = wrapper.findAll('.top-transaction-item')
      if (transactionItems.length > 0) {
        const firstItem = transactionItems.at(0)
        expect(firstItem.find('.transaction-info').exists()).toBe(true)
        expect(firstItem.find('.transaction-bar-container').exists()).toBe(true)
        expect(firstItem.find('.transaction-amount').exists()).toBe(true)
      }
    })
  })

  // 9. 筛选弹窗操作测试
  describe('筛选弹窗操作测试', () => {
    it('应该能重置筛选条件', () => {
      wrapper.vm.resetFilter()
      expect(wrapper.vm.filterTimeType).toBe('week')
      expect(wrapper.vm.filterExpense).toEqual(wrapper.vm.expenseCategories)
      expect(wrapper.vm.filterIncome).toEqual(wrapper.vm.incomeCategories)
    })

    it('应该能关闭筛选弹窗', () => {
      wrapper.vm.closeFilter()
      expect(wrapper.vm.showFilter).toBe(false)
    })

    it('应该能切换类别选择', () => {
      const initialLength = wrapper.vm.filterExpense.length
      wrapper.vm.toggleCategory('expense', '餐饮')
      
      // 如果原来包含，现在应该不包含；如果原来不包含，现在应该包含
      const newLength = wrapper.vm.filterExpense.length
      expect(newLength).not.toBe(initialLength)
    })
  })

  // 10. 图标和格式化测试
  describe('图标和格式化测试', () => {
    it('应该正确获取分类图标', () => {
      const icon = wrapper.vm.getCategoryIcon('餐饮')
      expect(typeof icon).toBe('string')
      expect(icon).toBe('🍔')
    })

    it('应该为未知分类返回默认图标', () => {
      const icon = wrapper.vm.getCategoryIcon('未知分类')
      expect(icon).toBe('📝')
    })

    it('应该正确处理日期格式', () => {
      expect(wrapper.vm.currentYear).toBe(new Date().getFullYear())
      expect(wrapper.vm.currentMonth).toBe(new Date().getMonth() + 1)
    })
  })

  // 11. API 调用测试
  describe('API 调用测试', () => {
    it('mounted时应该调用fetchChartData', async () => {
      const fetchSpy = jest.spyOn(Chart.methods, 'fetchChartData')
      
      const newWrapper = shallowMount(Chart, { localVue })
      
      expect(fetchSpy).toHaveBeenCalled()
      newWrapper.destroy()
      fetchSpy.mockRestore()
    })

    it('应该正确处理API响应', async () => {
      await wrapper.vm.fetchChartData()
      
      expect(axios.post).toHaveBeenCalled()
      expect(wrapper.vm.summary.income).toBe(8000)
      expect(wrapper.vm.summary.expense).toBe(6500)
      expect(wrapper.vm.summary.balance).toBe(1500)
    })

    it('应该正确处理API错误', async () => {
      axios.post.mockRejectedValueOnce(new Error('网络错误'))
      
      await wrapper.vm.fetchChartData()
      
      expect(wrapper.vm.error).toBe('获取图表数据失败')
    })
  })
})
