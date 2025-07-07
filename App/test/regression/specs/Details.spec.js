// Details页面组件测试用例示例
import { shallowMount } from '@vue/test-utils'
import Details from '@/views/Details.vue'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

describe('Details.vue - 明细页面测试', () => {
  let wrapper
  
  // 测试数据
  const mockApiResponse = {
    data: {
      summary: {
        total_income: 5000.00,
        total_expense: 3000.00,
        net_income: 2000.00
      },
      transactions: [
        {
          id: 1,
          datetime: '2024-12-15 12:30:00',
          category: '餐饮',
          specific_name: '午餐',
          amount: -25.00,
          type: 'expense'
        },
        {
          id: 2,
          datetime: '2024-12-15 09:00:00',
          category: '工资',
          specific_name: '月薪',
          amount: 5000.00,
          type: 'income'
        }
      ]
    }
  }

  beforeEach(() => {
    mockedAxios.get.mockResolvedValue(mockApiResponse)
    wrapper = shallowMount(Details, {
      data() {
        return {
          currentYear: 2024,
          currentMonth: 12
        }
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    wrapper.destroy()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染月份导航', () => {
      expect(wrapper.find('.month-navigation').exists()).toBe(true)
      expect(wrapper.find('.current-month').text()).toBe('2024-12')
      expect(wrapper.findAll('.nav-button')).toHaveLength(2)
    })

    it('应该渲染月度汇总卡片', () => {
      expect(wrapper.find('.summary-card').exists()).toBe(true)
      expect(wrapper.find('.month-expense-label').text()).toBe('本月支出(元)')
    })

    it('应该渲染明细列表容器', () => {
      expect(wrapper.find('.entries-list').exists()).toBe(true)
    })
  })

  describe('月份切换功能测试', () => {
    it('应该正确处理向前切换月份', async () => {
      const prevButton = wrapper.findAll('.nav-button').at(0)
      await prevButton.trigger('click')
      
      expect(wrapper.vm.currentMonth).toBe(11)
      expect(wrapper.vm.currentYear).toBe(2024)
    })

    it('应该正确处理跨年切换月份', async () => {
      wrapper.setData({ currentMonth: 1 })
      const prevButton = wrapper.findAll('.nav-button').at(0)
      await prevButton.trigger('click')
      
      expect(wrapper.vm.currentMonth).toBe(12)
      expect(wrapper.vm.currentYear).toBe(2023)
    })

    it('应该正确处理向后切换月份', async () => {
      const nextButton = wrapper.findAll('.nav-button').at(1)
      await nextButton.trigger('click')
      
      expect(wrapper.vm.currentMonth).toBe(1)
      expect(wrapper.vm.currentYear).toBe(2025)
    })
  })

  describe('数据加载和显示测试', () => {
    it('应该在组件挂载时获取数据', () => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:5000/get_transaction_list_for_frontend',
        expect.objectContaining({
          params: expect.objectContaining({
            start_date: '2024-12-01',
            end_date: '2024-12-31',
            transaction_type: 'all'
          })
        })
      )
    })

    it('应该正确显示汇总数据', async () => {
      await wrapper.vm.fetchMonthlyData()
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.summary.income).toBe(5000.00)
      expect(wrapper.vm.summary.expense).toBe(3000.00)
      expect(wrapper.vm.summary.balance).toBe(2000.00)
    })

    it('应该显示加载状态', async () => {
      wrapper.setData({ isLoading: true })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.find('.loading-state').text()).toBe('加载中...')
    })

    it('应该处理错误状态', async () => {
      wrapper.setData({ error: '网络连接失败' })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-state p').text()).toBe('网络连接失败')
      expect(wrapper.find('.retry-btn').exists()).toBe(true)
    })
  })

  describe('数据处理功能测试', () => {
    it('应该正确格式化日期头部', () => {
      const todayStr = '2024-12-15'
      const result = wrapper.vm.formatDateHeader(todayStr, true, '周日')
      expect(result).toBe('今天 12月15日 周日')
    })

    it('应该正确判断是否是今天', () => {
      const today = new Date()
      const todayStr = today.toISOString().substr(0, 10)
      expect(wrapper.vm.isToday(todayStr)).toBe(true)
      expect(wrapper.vm.isToday('2020-01-01')).toBe(false)
    })

    it('应该正确按日期分组交易记录', () => {
      const transactions = [
        { datetime: '2024-12-15 12:30:00', amount: -25, type: 'expense' },
        { datetime: '2024-12-15 09:00:00', amount: 5000, type: 'income' },
        { datetime: '2024-12-14 18:00:00', amount: -50, type: 'expense' }
      ]
      
      const result = wrapper.vm.groupEntriesByDate(transactions)
      expect(result).toHaveLength(2) // 两个不同的日期
      expect(result[0].date).toBe('2024-12-15') // 按日期倒序
      expect(result[0].income).toBe(5000)
      expect(result[0].expense).toBe(25)
    })

    it('应该返回正确的分类图标', () => {
      expect(wrapper.vm.getCategoryIcon('餐饮')).toBe('🍔')
      expect(wrapper.vm.getCategoryIcon('工资')).toBe('💰')
      expect(wrapper.vm.getCategoryIcon('未知分类')).toBe('📝')
    })

    it('应该返回正确的分类样式类名', () => {
      expect(wrapper.vm.getCategoryClass('餐饮')).toBe('category-food')
      expect(wrapper.vm.getCategoryClass('工资')).toBe('category-salary')
      expect(wrapper.vm.getCategoryClass('未知分类')).toBe('category-other')
    })
  })

  describe('异常处理测试', () => {
    it('应该处理API调用失败', async () => {
      mockedAxios.get.mockRejectedValue(new Error('网络错误'))
      
      await wrapper.vm.fetchMonthlyData()
      
      expect(wrapper.vm.error).toBe('获取数据失败，请刷新重试')
      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('应该处理无效日期格式', () => {
      const result = wrapper.vm.formatDateHeader('invalid-date', false, '')
      expect(result).toBe('invalid-date')
    })

    it('应该处理空数据情况', () => {
      const result = wrapper.vm.groupEntriesByDate([])
      expect(result).toEqual([])
    })
  })

  describe('用户交互测试', () => {
    it('应该在点击重试按钮时重新获取数据', async () => {
      wrapper.setData({ error: '网络错误' })
      await wrapper.vm.$nextTick()
      
      const retryBtn = wrapper.find('.retry-btn')
      await retryBtn.trigger('click')
      
      expect(mockedAxios.get).toHaveBeenCalled()
    })

    it('应该正确显示无数据状态', async () => {
      wrapper.setData({ 
        entries: [],
        isLoading: false,
        error: null
      })
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.no-data').exists()).toBe(true)
      expect(wrapper.find('.no-data p').text()).toContain('本月暂无交易记录')
    })
  })

  describe('响应式设计测试', () => {    it('应该有正确的CSS类名用于响应式布局', () => {
      expect(wrapper.find('.details-container').exists()).toBe(true)
      expect(wrapper.find('.summary-card').exists()).toBe(true)
      expect(wrapper.find('.entries-list').exists()).toBe(true)
    })

    it('应该为不同金额类型设置正确的样式类', async () => {
      wrapper.setData({
        summary: { balance: -500 }
      })
      
      // 等待DOM更新后检查样式类
      await wrapper.vm.$nextTick()
      
      const balanceElements = wrapper.findAll('.detail-amount')
      const balanceElement = balanceElements.at(1) // 第二个detail-amount是月结余
      expect(balanceElement.classes()).toContain('negative')
    })
  })
})
