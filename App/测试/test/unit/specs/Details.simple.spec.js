import Vue from 'vue'
import Details from '@/views/Details'

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn()
}))

const axios = require('axios')

describe('Details.vue', () => {
  let wrapper

  beforeEach(() => {
    // Reset axios mock
    axios.get.mockReset()
    
    const Constructor = Vue.extend(Details)
    wrapper = new Constructor().$mount()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.$destroy()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.$el.classList.contains('details-container')).toBe(true)
    })

    it('应该渲染月份导航', () => {
      const monthNav = wrapper.$el.querySelector('.month-navigation')
      expect(monthNav).toBeTruthy()
      
      const navButtons = wrapper.$el.querySelectorAll('.nav-button')
      expect(navButtons.length).toBe(2) // 左右按钮
      
      const currentMonth = wrapper.$el.querySelector('.current-month')
      expect(currentMonth).toBeTruthy()
    })

    it('应该渲染汇总卡片', () => {
      const summaryCard = wrapper.$el.querySelector('.summary-card')
      expect(summaryCard).toBeTruthy()
      
      const expenseAmount = wrapper.$el.querySelector('.month-expense-amount')
      const incomeColumn = wrapper.$el.querySelector('.income-column')
      const balanceColumn = wrapper.$el.querySelector('.balance-column')
      
      expect(expenseAmount).toBeTruthy()
      expect(incomeColumn).toBeTruthy()
      expect(balanceColumn).toBeTruthy()
    })

    it('应该渲染明细列表容器', () => {
      const entriesList = wrapper.$el.querySelector('.entries-list')
      expect(entriesList).toBeTruthy()
    })
  })

  describe('数据初始化测试', () => {
    it('应该正确初始化数据', () => {
      const currentDate = new Date()
      expect(wrapper.$data.currentYear).toBe(currentDate.getFullYear())
      expect(wrapper.$data.currentMonth).toBe(currentDate.getMonth() + 1)
      expect(wrapper.$data.summary.expense).toBe(0)
      expect(wrapper.$data.summary.income).toBe(0)
      expect(wrapper.$data.summary.balance).toBe(0)
      expect(Array.isArray(wrapper.$data.entries)).toBe(true)
      expect(wrapper.$data.isLoading).toBe(false)
      expect(wrapper.$data.error).toBeNull()
    })
  })

  describe('getCategoryIcon方法测试', () => {
    it('应该返回正确的类别图标', () => {
      expect(wrapper.getCategoryIcon('餐饮')).toBe('🍔')
      expect(wrapper.getCategoryIcon('交通')).toBe('🚗')
      expect(wrapper.getCategoryIcon('工资')).toBe('💰')
      expect(wrapper.getCategoryIcon('住房')).toBe('🏠')
      expect(wrapper.getCategoryIcon('投资')).toBe('📈')
      expect(wrapper.getCategoryIcon('医疗')).toBe('💊')
    })

    it('应该为未知类别返回默认图标', () => {
      expect(wrapper.getCategoryIcon('未知类别')).toBe('📝')
      expect(wrapper.getCategoryIcon('')).toBe('📝')
      expect(wrapper.getCategoryIcon(null)).toBe('📝')
    })
  })

  describe('getCategoryClass方法测试', () => {
    it('应该返回正确的类别CSS类名', () => {
      expect(wrapper.getCategoryClass('餐饮')).toBe('category-food')
      expect(wrapper.getCategoryClass('交通')).toBe('category-transport')
      expect(wrapper.getCategoryClass('工资')).toBe('category-salary')
      expect(wrapper.getCategoryClass('住房')).toBe('category-housing')
      expect(wrapper.getCategoryClass('投资')).toBe('category-investment')
    })

    it('应该为未知类别返回默认CSS类名', () => {
      expect(wrapper.getCategoryClass('未知类别')).toBe('category-other')
      expect(wrapper.getCategoryClass('')).toBe('category-other')
      expect(wrapper.getCategoryClass(null)).toBe('category-other')
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

  describe('日期处理方法测试', () => {
    describe('isToday方法', () => {
      it('应该正确识别今天的日期', () => {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD格式
        expect(wrapper.isToday(todayStr)).toBe(true)
      })

      it('应该正确识别非今天的日期', () => {
        expect(wrapper.isToday('2020-01-01')).toBe(false)
      })

      it('应该处理无效日期', () => {
        expect(wrapper.isToday('')).toBe(false)
        expect(wrapper.isToday(null)).toBe(false)
        expect(wrapper.isToday('invalid-date')).toBe(false)
      })
    })

    describe('getWeekday方法', () => {
      it('应该返回正确的星期几', () => {
        // 2024-01-01是周一
        expect(wrapper.getWeekday('2024-01-01')).toBe('周一')
        // 2024-01-07是周日
        expect(wrapper.getWeekday('2024-01-07')).toBe('周日')
      })

      it('应该处理无效日期', () => {
        expect(wrapper.getWeekday('')).toBe('')
        expect(wrapper.getWeekday(null)).toBe('')
        expect(wrapper.getWeekday('invalid-date')).toBe('')
      })
    })

    describe('formatDateHeader方法', () => {
      it('应该正确格式化日期头部', () => {
        const result = wrapper.formatDateHeader('2024-01-01', false, '周一')
        expect(result).toMatch(/1月1日 周一/)
      })

      it('今天的日期应该显示"今天"', () => {
        const result = wrapper.formatDateHeader('2024-01-01', true, '周一')
        expect(result).toMatch(/今天 1月1日 周一/)
      })

      it('应该处理无效日期', () => {
        expect(wrapper.formatDateHeader('', false, '')).toBe('加载中...')
        expect(wrapper.formatDateHeader(null, false, '')).toBe('加载中...')
      })
    })
  })

  describe('数据分组测试', () => {
    describe('groupEntriesByDate方法', () => {
      it('应该正确按日期分组交易', () => {
        const transactions = [
          {
            id: 1,
            datetime: '2024-01-01 10:00:00',
            type: 'expense',
            amount: 100,
            category: '餐饮'
          },
          {
            id: 2,
            datetime: '2024-01-01 15:00:00',
            type: 'income',
            amount: 200,
            category: '工资'
          },
          {
            id: 3,
            datetime: '2024-01-02 12:00:00',
            type: 'expense',
            amount: 50,
            category: '交通'
          }
        ]

        const grouped = wrapper.groupEntriesByDate(transactions)
        
        expect(grouped.length).toBe(2) // 两天的数据
        expect(grouped[0].date).toBe('2024-01-02') // 按日期倒序
        expect(grouped[1].date).toBe('2024-01-01')
        expect(grouped[1].entries.length).toBe(2) // 01-01有两条记录
        expect(grouped[1].income).toBe(200)
        expect(grouped[1].expense).toBe(100)
      })

      it('应该处理空数组', () => {
        const result = wrapper.groupEntriesByDate([])
        expect(result).toEqual([])
      })

      it('应该处理无效输入', () => {
        const result = wrapper.groupEntriesByDate(null)
        expect(result).toEqual([])
      })
    })
  })

  describe('API调用测试', () => {
    it('fetchMonthlyData应该调用后端API', async () => {
      const mockResponse = {
        data: {
          summary: {
            total_income: 5000,
            total_expense: 3000,
            net_income: 2000
          },
          transactions: []
        }
      }
      
      axios.get.mockResolvedValue(mockResponse)
      
      await wrapper.fetchMonthlyData()
      
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:5000/monthly_details',
        expect.objectContaining({
          params: expect.objectContaining({
            year: wrapper.$data.currentYear,
            month: wrapper.$data.currentMonth
          })
        })
      )
      
      expect(wrapper.$data.summary.income).toBe(5000)
      expect(wrapper.$data.summary.expense).toBe(3000)
      expect(wrapper.$data.summary.balance).toBe(2000)
    })

    it('API调用失败应该设置错误状态', async () => {
      axios.get.mockRejectedValue(new Error('Network Error'))
      
      await wrapper.fetchMonthlyData()
      
      expect(wrapper.$data.error).toContain('获取数据失败')
      expect(wrapper.$data.isLoading).toBe(false)
    })

    it('API返回错误信息应该抛出异常', async () => {
      const mockResponse = {
        data: {
          error: '服务器内部错误'
        }
      }
      
      axios.get.mockResolvedValue(mockResponse)
      
      await wrapper.fetchMonthlyData()
      
      expect(wrapper.$data.error).toContain('获取数据失败')
    })
  })

  describe('UI状态测试', () => {
    it('加载状态应该显示加载指示器', async () => {
      wrapper.$data.isLoading = true
      await wrapper.$nextTick()
      
      const loadingState = wrapper.$el.querySelector('.loading-state')
      expect(loadingState).toBeTruthy()
      expect(loadingState.textContent).toContain('加载中')
    })

    it('错误状态应该显示错误信息和重试按钮', async () => {
      wrapper.$data.error = '网络错误'
      wrapper.$data.isLoading = false
      await wrapper.$nextTick()
      
      const errorState = wrapper.$el.querySelector('.error-state')
      expect(errorState).toBeTruthy()
      expect(errorState.textContent).toContain('网络错误')
      
      const retryBtn = wrapper.$el.querySelector('.retry-btn')
      expect(retryBtn).toBeTruthy()
    })

    it('无数据状态应该显示占位符', async () => {
      wrapper.$data.entries = []
      wrapper.$data.isLoading = false
      wrapper.$data.error = null
      await wrapper.$nextTick()
      
      const noData = wrapper.$el.querySelector('.no-data')
      expect(noData).toBeTruthy()
      expect(noData.textContent).toContain('暂无交易记录')
    })
  })

  describe('汇总卡片显示测试', () => {
    it('应该正确显示汇总金额', async () => {
      wrapper.$data.summary = {
        expense: 3000.50,
        income: 5000.25,
        balance: 1999.75
      }
      await wrapper.$nextTick()
      
      const expenseAmount = wrapper.$el.querySelector('.month-expense-amount')
      const incomeAmount = wrapper.$el.querySelector('.income-column .detail-amount')
      const balanceAmount = wrapper.$el.querySelector('.balance-column .detail-amount')
      
      expect(expenseAmount.textContent).toContain('3000.50')
      expect(incomeAmount.textContent).toContain('5000.25')
      expect(balanceAmount.textContent).toContain('1999.75')
    })

    it('负余额应该有特殊样式', async () => {
      wrapper.$data.summary.balance = -500
      await wrapper.$nextTick()
      
      const balanceAmount = wrapper.$el.querySelector('.balance-column .detail-amount')
      expect(balanceAmount.classList.contains('negative')).toBe(true)
    })
  })

  describe('生命周期测试', () => {
    it('组件挂载时应该调用fetchMonthlyData', () => {
      const fetchSpy = jest.spyOn(Details.methods, 'fetchMonthlyData').mockImplementation(() => {})
      
      const Constructor = Vue.extend(Details)
      const testWrapper = new Constructor().$mount()
      
      expect(fetchSpy).toHaveBeenCalled()
      
      fetchSpy.mockRestore()
      testWrapper.$destroy()
    })
  })
})
