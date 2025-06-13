import Vue from 'vue'
import Record from '@/views/Record'

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn()
}))

const axios = require('axios')

describe('Record.vue', () => {
  let wrapper

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear()
    
    // Reset axios mock
    axios.post.mockReset()
    
    const Constructor = Vue.extend(Record)
    wrapper = new Constructor().$mount()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.$destroy()
    }
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染组件', () => {
      expect(wrapper.$el.classList.contains('record-container')).toBe(true)
    })

    it('应该渲染聊天容器', () => {
      const chatContainer = wrapper.$el.querySelector('.chat-container')
      expect(chatContainer).toBeTruthy()
    })

    it('应该渲染消息容器', () => {
      const messagesContainer = wrapper.$el.querySelector('.messages-container')
      expect(messagesContainer).toBeTruthy()
    })

    it('应该渲染输入区域', () => {
      const inputArea = wrapper.$el.querySelector('.input-area')
      expect(inputArea).toBeTruthy()
    })
  })

  describe('数据初始化测试', () => {
    it('应该正确初始化数据', () => {
      expect(wrapper.$data.userInput).toBe('')
      expect(wrapper.$data.isAiTyping).toBe(false)
      expect(wrapper.$data.aiStarted).toBe(false)
      expect(wrapper.$data.aiStarting).toBe(false)
      expect(wrapper.$data.startupError).toBeNull()
      expect(Array.isArray(wrapper.$data.messages)).toBe(true)
    })

    it('初始化时应该有欢迎消息', () => {
      expect(wrapper.$data.messages.length).toBeGreaterThan(0)
      expect(wrapper.$data.messages[0].isUser).toBe(false)
      expect(wrapper.$data.messages[0].content).toContain('欢迎使用AI记账助手')
    })
  })

  describe('格式化方法测试', () => {
    describe('formatAmount', () => {
      it('应该正确格式化数字金额', () => {
        expect(wrapper.formatAmount(100)).toBe('100.0')
        expect(wrapper.formatAmount(100.5)).toBe('100.5')
        expect(wrapper.formatAmount(100.99)).toBe('101.0')
      })

      it('应该处理字符串输入', () => {
        expect(wrapper.formatAmount('100')).toBe('100.0')
        expect(wrapper.formatAmount('100.5')).toBe('100.5')
      })

      it('应该处理无效输入', () => {
        expect(wrapper.formatAmount(null)).toBe('0.0')
        expect(wrapper.formatAmount(undefined)).toBe('0.0')
        expect(wrapper.formatAmount('abc')).toBe('0.0')
        expect(wrapper.formatAmount('')).toBe('0.0')
      })
    })

    describe('formatLedgerDate', () => {
      it('应该正确格式化日期', () => {
        const testDate = '2024-01-15T10:30:00.000Z'
        const formatted = wrapper.formatLedgerDate(testDate)
        expect(formatted).toMatch(/\d{4}年\d{2}月\d{2}日/)
      })

      it('应该处理空值', () => {
        expect(wrapper.formatLedgerDate(null)).toBe('')
        expect(wrapper.formatLedgerDate(undefined)).toBe('')
        expect(wrapper.formatLedgerDate('')).toBe('')
      })
    })

    describe('getCategoryIcon', () => {
      it('应该返回正确的类别图标', () => {
        expect(wrapper.getCategoryIcon('餐饮')).toBe('🍔')
        expect(wrapper.getCategoryIcon('交通')).toBe('🚗')
        expect(wrapper.getCategoryIcon('工资')).toBe('💰')
        expect(wrapper.getCategoryIcon('住房')).toBe('🏠')
      })

      it('应该为未知类别返回默认图标', () => {
        expect(wrapper.getCategoryIcon('未知类别')).toBe('📝')
        expect(wrapper.getCategoryIcon('')).toBe('📝')
        expect(wrapper.getCategoryIcon(null)).toBe('📝')
      })
    })
  })

  describe('消息处理测试', () => {
    it('空消息不应该发送', () => {
      wrapper.$data.userInput = ''
      wrapper.sendMessage()
      
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('只有空白字符的消息不应该发送', () => {
      wrapper.$data.userInput = '   '
      wrapper.sendMessage()
      
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('有效消息应该添加到消息列表', () => {
      wrapper.$data.userInput = '今天午饭花了30元'
      wrapper.$data.aiStarted = true
      
      const initialMessageCount = wrapper.$data.messages.length
      wrapper.sendMessage()
      
      expect(wrapper.$data.messages.length).toBe(initialMessageCount + 1)
      expect(wrapper.$data.messages[wrapper.$data.messages.length - 1].content).toBe('今天午饭花了30元')
      expect(wrapper.$data.messages[wrapper.$data.messages.length - 1].isUser).toBe(true)
    })

    it('发送消息后应该清空输入框', () => {
      wrapper.$data.userInput = '测试消息'
      wrapper.$data.aiStarted = true
      wrapper.sendMessage()
      
      expect(wrapper.$data.userInput).toBe('')
    })
  })

  describe('AI启动测试', () => {
    it('启动AI时应该设置正确的状态', () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: 'AI启动成功' }
      })

      wrapper.startAiAssistant()
      
      expect(wrapper.$data.aiStarting).toBe(true)
      expect(wrapper.$data.startupError).toBeNull()
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/start')
    })

    it('AI启动成功后应该更新状态', async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: 'AI启动成功' }
      })

      await wrapper.startAiAssistant()
      
      expect(wrapper.$data.aiStarted).toBe(true)
      expect(wrapper.$data.aiStarting).toBe(false)
    })

    it('AI启动失败应该设置错误信息', async () => {
      const errorMessage = '服务器连接失败'
      axios.post.mockRejectedValue({
        response: { data: { error: errorMessage } }
      })

      await wrapper.startAiAssistant()
      
      expect(wrapper.$data.startupError).toBe(errorMessage)
      expect(wrapper.$data.aiStarting).toBe(false)
    })
  })

  describe('API调用测试', () => {
    it('成功的API调用应该添加AI回复', async () => {
      const mockResponse = {
        data: {
          replyText: '已记录您的消费：午饭30元',
          ledgerEntry: {
            amount: 30,
            categoryTag: '餐饮',
            specificName: '午饭',
            time: new Date().toISOString()
          }
        }
      }
      
      axios.post.mockResolvedValue(mockResponse)
      
      const initialMessageCount = wrapper.$data.messages.length
      await wrapper.callBackendAPI('今天午饭花了30元')
      
      expect(wrapper.$data.messages.length).toBe(initialMessageCount + 2) // AI回复 + 记账卡片
      expect(wrapper.$data.isAiTyping).toBe(false)
    })

    it('API调用失败应该显示错误消息', async () => {
      axios.post.mockRejectedValue(new Error('Network Error'))
      
      const initialMessageCount = wrapper.$data.messages.length
      await wrapper.callBackendAPI('测试消息')
      
      expect(wrapper.$data.messages.length).toBe(initialMessageCount + 1)
      expect(wrapper.$data.messages[wrapper.$data.messages.length - 1].content).toContain('AI服务暂时不可用')
      expect(wrapper.$data.isAiTyping).toBe(false)
    })
  })

  describe('本地存储测试', () => {
    it('消息变化应该保存到localStorage', () => {
      const testMessage = {
        content: '测试消息',
        isUser: true,
        timestamp: new Date().toISOString()
      }
      
      wrapper.$data.messages.push(testMessage)
      wrapper.$options.watch.messages.handler.call(wrapper, wrapper.$data.messages)
      
      const saved = localStorage.getItem('ai_accounting_messages')
      expect(saved).toBeTruthy()
      
      const parsedMessages = JSON.parse(saved)
      expect(parsedMessages[parsedMessages.length - 1].content).toBe('测试消息')
    })
  })

  describe('滚动行为测试', () => {
    it('scrollToBottom方法应该正确执行', () => {
      // 模拟messagesContainer
      const mockContainer = {
        scrollHeight: 1000,
        scrollTop: 0
      }
      wrapper.$refs = { messagesContainer: mockContainer }
      
      wrapper.scrollToBottom()
      
      expect(mockContainer.scrollTop).toBe(1000)
    })
  })
})
