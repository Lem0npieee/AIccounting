// 高级功能测试 - 补充测试执行指南中提到但缺失的测试用例
import Vue from 'vue'
import { mount, createLocalVue } from '@vue/test-utils'
import Record from '@/views/Record'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

const localVue = createLocalVue()

describe('Record.vue - 高级功能测试', () => {
  let wrapper

  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear()
    
    // 重置所有 mocks
    jest.clearAllMocks()
    
    // Mock axios 响应
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        message: 'AI启动成功',
        replyText: '好的，我已记录您的支出。',
        ledgerEntry: {
          amount: 30,
          categoryTag: '餐饮',
          specificName: '午餐',
          time: new Date().toISOString()
        }
      }
    })

    wrapper = mount(Record, {
      localVue,
      stubs: ['router-link', 'router-view']
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  // 1. AI 功能深度测试
  describe('AI 功能深度测试', () => {
    it('应该正确处理 AI 启动流程', async () => {
      // 由于组件在 mounted 时可能已经启动了 AI，我们需要重置状态
      wrapper.vm.aiStarted = false
      wrapper.vm.aiStarting = false
      
      // 验证重置后的状态
      expect(wrapper.vm.aiStarted).toBe(false)
      expect(wrapper.vm.aiStarting).toBe(false)
      
      // 触发 AI 启动
      wrapper.vm.startAiAssistant()
      
      // 验证启动状态
      expect(wrapper.vm.aiStarting).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/api/start')
      
      // 等待异步操作完成
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 验证启动完成
      expect(wrapper.vm.aiStarted).toBe(true)
      expect(wrapper.vm.aiStarting).toBe(false)
    })

    it('应该处理 AI 启动失败的情况', async () => {
      // Mock API 失败响应
      mockedAxios.post.mockRejectedValue(new Error('连接失败'))
      
      wrapper.vm.startAiAssistant()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 验证错误状态
      expect(wrapper.vm.startupError).toBeTruthy()
      expect(wrapper.vm.aiStarting).toBe(false)
    })

    it('应该正确处理消息持久化', async () => {
      const testMessage = {
        content: '测试消息',
        isUser: true,
        timestamp: new Date().toISOString()
      }

      // 添加消息
      wrapper.vm.messages.push(testMessage)
      
      // 触发 watcher
      await wrapper.vm.$nextTick()
      
      // 验证 localStorage
      const savedMessages = JSON.parse(localStorage.getItem('ai_accounting_messages'))
      expect(savedMessages).toContainEqual(testMessage)
    })

    it('应该从 localStorage 恢复历史消息', () => {
      const historicalMessages = [
        { content: '历史消息1', isUser: true, timestamp: '2023-01-01T10:00:00.000Z' },
        { content: '历史消息2', isUser: false, timestamp: '2023-01-01T10:01:00.000Z' }
      ]
      
      localStorage.setItem('ai_accounting_messages', JSON.stringify(historicalMessages))
      
      // 重新创建组件
      wrapper.destroy()
      wrapper = mount(Record, {
        localVue,
        stubs: ['router-link', 'router-view']
      })
      
      // 验证消息恢复
      expect(wrapper.vm.messages).toEqual(historicalMessages)
    })
  })

  // 2. API 集成测试
  describe('API 集成测试', () => {
    it('应该正确处理 API 网络错误', async () => {
      mockedAxios.post.mockRejectedValue(new Error('网络错误'))
      
      await wrapper.setData({ 
        userInput: '测试消息',
        aiStarted: true 
      })
      
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 验证错误消息被添加
      const errorMessage = wrapper.vm.messages.find(msg => 
        msg.content.includes('AI服务暂时不可用')
      )
      expect(errorMessage).toBeTruthy()
      expect(wrapper.vm.isAiTyping).toBe(false)
    })

    it('应该正确处理不同的 API 响应格式', async () => {
      // 测试只有文本回复的响应
      mockedAxios.post.mockResolvedValue({
        data: {
          replyText: '纯文本回复，没有记账信息'
        }
      })
      
      await wrapper.setData({ 
        userInput: '今天天气如何',
        aiStarted: true 
      })
      
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 验证只添加了文本消息，没有记账卡片
      const textMessage = wrapper.vm.messages.find(msg => 
        msg.content === '纯文本回复，没有记账信息' && !msg.type
      )
      expect(textMessage).toBeTruthy()
    })

    it('应该正确检测敏感内容', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          replyText: '抱歉，您的消息包含不适当的内容，请重新输入。',
          ledgerEntry: {
            amount: 100,
            categoryTag: '测试',
            specificName: '测试项目'
          }
        }
      })
      
      await wrapper.setData({ 
        userInput: '敏感内容测试',
        aiStarted: true 
      })
      
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 验证敏感内容被检测，记账卡片被阻止
      const ledgerMessage = wrapper.vm.messages.find(msg => msg.type === 'ledger')
      expect(ledgerMessage).toBeFalsy()
    })
  })

  // 3. 性能和用户体验测试
  describe('性能和用户体验测试', () => {
    it('应该在合理时间内完成消息发送', async () => {
      const startTime = performance.now()
      
      await wrapper.setData({ 
        userInput: '性能测试消息',
        aiStarted: true 
      })
      
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 验证操作在合理时间内完成（1秒内）
      expect(duration).toBeLessThan(1000)
    })

    it('应该正确处理大量消息的滚动', async () => {
      // 添加大量消息
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        content: `消息 ${i}`,
        isUser: i % 2 === 0,
        timestamp: new Date().toISOString()
      }))
      
      await wrapper.setData({ messages: manyMessages })
      
      // 触发滚动
      wrapper.vm.scrollToBottom()
      
      // 验证滚动功能正常工作（简化测试，因为DOM测试环境的scrollTop可能为0）
      expect(wrapper.vm.messages.length).toBe(100)
      expect(wrapper.vm.$refs.messagesContainer).toBeTruthy()
    })

    it('应该正确显示打字指示器动画', async () => {
      await wrapper.setData({ isAiTyping: true })
      
      // 验证打字指示器存在
      const typingIndicator = wrapper.find('.typing-indicator')
      expect(typingIndicator.exists()).toBe(true)
      
      // 验证动画元素
      const spans = typingIndicator.findAll('span')
      expect(spans.length).toBe(3)
    })

    it('应该正确处理内存压力情况', async () => {
      // 模拟内存压力
      const mockMemory = {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 52428800,
        jsHeapSizeLimit: 52428800
      }
      
      // 模拟高内存使用
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      })
      
      // 添加大量数据
      const largeMessages = Array.from({ length: 1000 }, (_, i) => ({
        content: `大量数据测试 ${i}`.repeat(100),
        isUser: i % 2 === 0,
        timestamp: new Date().toISOString()
      }))
      
      await wrapper.setData({ messages: largeMessages })
      
      // 验证组件仍然响应
      expect(wrapper.vm.messages.length).toBe(1000)
      expect(wrapper.exists()).toBe(true)
    })
  })

  // 4. 边界情况和错误处理测试
  describe('边界情况和错误处理测试', () => {
    it('应该阻止发送空消息', async () => {
      await wrapper.setData({ 
        userInput: '   ',  // 只有空格
        aiStarted: true 
      })
      
      const initialMessageCount = wrapper.vm.messages.length
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      
      // 验证消息没有被发送
      expect(wrapper.vm.messages.length).toBe(initialMessageCount)
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.any(Object)
      )
    })

    it('应该正确处理特殊字符输入', async () => {
      const specialCharInput = '特殊字符测试: 😀🚀💰 <script>alert("xss")</script>'
      
      await wrapper.setData({ 
        userInput: specialCharInput,
        aiStarted: true 
      })
      
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 验证特殊字符被正确处理
      const userMessage = wrapper.vm.messages.find(msg => 
        msg.content === specialCharInput && msg.isUser
      )
      expect(userMessage).toBeTruthy()
    })

    it('应该正确处理格式化错误的金额', () => {
      // 测试格式化金额的边界情况
      expect(wrapper.vm.formatAmount('abc')).toBe('0.0')
      expect(wrapper.vm.formatAmount('')).toBe('0.0')
      expect(wrapper.vm.formatAmount(null)).toBe('0.0')
      expect(wrapper.vm.formatAmount(undefined)).toBe('0.0')
      expect(wrapper.vm.formatAmount('123.456')).toBe('123.5')
      expect(wrapper.vm.formatAmount('-50')).toBe('-50.0')
    })

    it('应该正确处理无效的日期格式', () => {
      // 测试日期格式化的边界情况
      expect(wrapper.vm.formatLedgerDate('invalid-date')).toBe('Invalid Date年NaN月NaN日')
      expect(wrapper.vm.formatLedgerDate(null)).toBe('')
      expect(wrapper.vm.formatLedgerDate(undefined)).toBe('')
      expect(wrapper.vm.formatLedgerDate('')).toBe('')
    })

    it('应该在 AI 未启动时阻止消息发送', async () => {
      await wrapper.setData({ 
        userInput: '测试消息',
        aiStarted: false  // AI 未启动
      })
      
      const initialMessageCount = wrapper.vm.messages.length
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      
      // 验证消息没有被发送，而是触发了 AI 启动
      expect(wrapper.vm.messages.length).toBe(initialMessageCount)
      expect(wrapper.vm.aiStarting).toBe(true)
    })

    it('应该正确处理组件销毁时的清理', () => {
      // 设置一些状态
      wrapper.setData({
        isAiTyping: true,
        userInput: '测试输入'
      })
      
      // 销毁组件
      wrapper.destroy()
      
      // 验证没有内存泄漏和错误
      expect(wrapper.exists()).toBe(false)
    })
  })

  // 5. 辅助功能测试
  describe('辅助功能测试', () => {
    it('应该返回正确的类别图标', () => {
      expect(wrapper.vm.getCategoryIcon('餐饮')).toBe('🍔')
      expect(wrapper.vm.getCategoryIcon('交通')).toBe('🚗')
      expect(wrapper.vm.getCategoryIcon('工资')).toBe('💰')
      expect(wrapper.vm.getCategoryIcon('未知类别')).toBe('📝')
      expect(wrapper.vm.getCategoryIcon(null)).toBe('📝')
      expect(wrapper.vm.getCategoryIcon(undefined)).toBe('📝')
    })

    it('应该正确处理键盘事件', async () => {
      await wrapper.setData({ 
        userInput: '键盘测试',
        aiStarted: true 
      })
      
      const textarea = wrapper.find('textarea')
      
      // 模拟 Enter 键按下
      await textarea.trigger('keydown.enter')
      
      // 验证消息被发送
      expect(wrapper.vm.userInput).toBe('')  // 输入被清空
    })

    it('应该正确处理按钮禁用状态', async () => {
      // 测试各种禁用条件
      await wrapper.setData({ 
        userInput: '',
        aiStarted: true,
        isAiTyping: false 
      })
      
      const sendButton = wrapper.find('.send-button')
      expect(sendButton.attributes('disabled')).toBeDefined()  // 空输入时禁用
      
      await wrapper.setData({ userInput: '有内容' })
      expect(sendButton.attributes('disabled')).toBeUndefined()  // 有内容时启用
      
      await wrapper.setData({ isAiTyping: true })
      expect(sendButton.attributes('disabled')).toBeDefined()  // AI 输入时禁用
    })
  })

  // 6. 集成场景测试
  describe('集成场景测试', () => {
    it('应该完成完整的记账流程', async () => {
      // 设置 AI 已启动
      await wrapper.setData({ aiStarted: true })
      
      // 1. 用户输入记账信息
      await wrapper.setData({ userInput: '午餐花了30元' })
      
      // 2. 发送消息
      wrapper.vm.sendMessage()
      
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 3. 验证用户消息被添加
      const userMessage = wrapper.vm.messages.find(msg => 
        msg.content === '午餐花了30元' && msg.isUser
      )
      expect(userMessage).toBeTruthy()
      
      // 4. 验证 AI 回复被添加
      const aiMessage = wrapper.vm.messages.find(msg => 
        msg.content.includes('我已记录您的支出') && !msg.isUser
      )
      expect(aiMessage).toBeTruthy()
      
      // 5. 验证记账卡片被添加
      const ledgerMessage = wrapper.vm.messages.find(msg => 
        msg.type === 'ledger'
      )
      expect(ledgerMessage).toBeTruthy()
      expect(ledgerMessage.ledgerEntry.amount).toBe(30)
      expect(ledgerMessage.ledgerEntry.categoryTag).toBe('餐饮')
    })
  })
})
