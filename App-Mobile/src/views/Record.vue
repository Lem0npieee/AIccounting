<template>
  <div class="record-container">
    <div class="chat-container">
      <!-- 聊天消息区域 -->
      <div class="messages-container" ref="messagesContainer">
        <!-- AI启动状态消息 -->
        <div class="message ai-message" v-if="aiStarting && !aiStarted">
          <div class="message-content">
            <p>正在启动AI记账助手，请稍等...</p>
            <div class="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        
        <!-- 启动错误消息 -->
        <div class="message ai-message error-message" v-if="startupError">
          <div class="message-content">
            <p>启动AI记账助手时出现错误: {{ startupError }}</p>
            <p>请刷新页面或联系管理员。</p>
          </div>
        </div>
        
        <!-- 动态消息列表 -->        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.isUser ? 'user-message' : 'ai-message', message.type === 'ledger' ? 'ledger-message' : '']"
        >
          <!-- 使用小分隔符标记新的对话交互 -->
          <div v-if="index > 0 && messages[index-1].isUser && !message.isUser && message.type !== 'ledger'" class="conversation-divider">
            <span class="divider-line"></span>
          </div>
          
          <template v-if="message.type === 'ledger' && message.ledgerEntry">
            <div class="ledger-card">
              <div class="ledger-header">
                <span class="ledger-icon">💴</span>
                <span class="ledger-status">已记录：</span>
                <span class="ledger-date">{{ formatLedgerDate(message.ledgerEntry.time) }}</span>
              </div>
              <div class="ledger-body">
                <div class="ledger-category-icon">{{ getCategoryIcon(message.ledgerEntry.categoryTag || '其他') }}</div>
                <div class="ledger-info">
                  <div class="ledger-category">{{ message.ledgerEntry.categoryTag || '其他' }}</div>
                  <div class="ledger-desc">{{ message.ledgerEntry.specificName || '未命名项目' }}</div>
                </div>
                <div class="ledger-amount">
                  <span>¥{{ formatAmount(message.ledgerEntry.amount) }}</span>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="message-content">
              <p v-html="message.content"></p>
            </div>
          </template>
        </div>
        
        <!-- 输入中的指示 -->
        <div class="message ai-message" v-if="isAiTyping">
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-container">
        <button 
          class="clear-button" 
          @click="clearHistory" 
          title="清除历史记录"
          :disabled="isAiTyping || aiStarting || !aiStarted || messages.length === 0"
        >
          🗑️
        </button>
        <textarea 
          ref="inputBox"
          v-model="userInput" 
          placeholder="输入收支情况，如：中午吃饭花了25元" 
          @keydown.enter.prevent="sendMessage"
          :disabled="isAiTyping || aiStarting || !aiStarted || startupError"
        ></textarea>
        <button 
          class="send-button" 
          @click="sendMessage" 
          :disabled="!userInput.trim() || isAiTyping || aiStarting || !aiStarted || startupError"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import ApiService from '../services/ApiService'

// 状态变量
const userInput = ref('')
const messages = ref([])
const isAiTyping = ref(false)
const aiStarted = ref(false)
const aiStarting = ref(false)
const startupError = ref(null)
const messagesContainer = ref(null)
const inputBox = ref(null)

// 监听消息列表，保存到localStorage
watch(messages, (newVal) => {
  localStorage.setItem('ai_accounting_messages', JSON.stringify(newVal))
}, { deep: true })

// 组件挂载时
onMounted(() => {
  // 加载历史消息
  try {
    const savedMessages = localStorage.getItem('ai_accounting_messages')
    if (savedMessages) {
      messages.value = JSON.parse(savedMessages)
    } else {
      // 如果没有历史消息，则显示欢迎消息
      messages.value = [
        {
          content: `<b>🤖 欢迎使用AI记账助手！</b><br>👉 您可以直接输入收支情况，例如：'今天午饭花了35元'<br>👉 或者查询报表，例如：'帮我分析本月的消费情况'<br>👉 也可以与我闲聊，我会以助手的身份回答您的问题~<br>`,
          isUser: false,
          timestamp: new Date().toISOString()
        }
      ]
    }
  } catch (e) {
    console.error('加载历史消息失败', e)
    // 出错时也显示欢迎消息
    messages.value = [
      {
        content: `<b>🤖 欢迎使用AI记账助手！</b><br>👉 您可以直接输入收支情况，例如：'今天午饭花了35元'<br>👉 或者查询报表，例如：'帮我分析本月的消费情况'<br>👉 也可以与我闲聊，我会以助手的身份回答您的问题~<br>`,
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]
  }

  // 确保等DOM更新后再滚动到底部
  nextTick(() => {
    // 添加短暂延时，确保渲染完成
    setTimeout(() => {
      scrollToBottom()
    }, 300)
  })
  
  // 自动启动AI助手
  startAiAssistant()
  
  // 设置焦点到输入框
  if (inputBox.value) {
    inputBox.value.focus()
  }
})

// 启动AI助手
const startAiAssistant = async () => {
  aiStarting.value = true
  startupError.value = null
  
  try {
    // 初始化数据库和AI
    const response = await ApiService.startAI()
    if (response.success) {
      aiStarted.value = true
      console.log('AI启动成功:', response.message)
    } else {
      console.log('AI启动中:', response.message)
      setTimeout(() => checkAiStatus(), 2000)
    }
  } catch (error) {
    startupError.value = error.message || '无法连接到服务器'
    console.error('AI启动失败:', error)
  } finally {
    aiStarting.value = false
  }
}
  
// 检查AI助手启动状态
const checkAiStatus = async () => {
  try {
    const response = await ApiService.startAI()
    if (response.success) {
      aiStarted.value = true
      console.log('AI启动成功:', response.message)
    } else {
      startupError.value = '无法启动AI记账助手'
    }
  } catch (error) {
    startupError.value = error.message || '无法连接到服务器'
    console.error('AI状态检查失败:', error)
  } finally {
    aiStarting.value = false
  }
}

// 发送消息
const sendMessage = async () => {
  const message = userInput.value.trim()
  if (!message) return
  
  // 检查AI助手是否已启动
  if (!aiStarted.value) {
    startAiAssistant()
    return
  }
  
  // 添加用户消息到界面
  messages.value.push({
    content: message,
    isUser: true,
    timestamp: new Date().toISOString()
  })
  
  // 清空输入框
  userInput.value = ''
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 设置AI正在输入状态
  isAiTyping.value = true
  
  // 调用AI服务
  try {
    const response = await ApiService.handleChatMessage(message)
    isAiTyping.value = false
    
    // 处理返回的数据
    if (typeof response === 'string') {
      // 普通文本回复
      messages.value.push({
        content: response,
        isUser: false,
        timestamp: new Date().toISOString()
      })    } else if (response && response.replyText) {
      // 添加AI的文字回复消息
      messages.value.push({
        content: response.replyText,
        isUser: false,
        timestamp: new Date().toISOString()
      });
      
      // 如果有记账条目
      if (response.ledgerEntry) {
        // 确保ledgerEntry始终是数组
        const entries = Array.isArray(response.ledgerEntry) ? response.ledgerEntry : [response.ledgerEntry];
        
        // 简单地追加记账卡片到消息列表末尾
        for (const entry of entries) {
          messages.value.push({
            type: 'ledger',
            ledgerEntry: entry,
            isUser: false,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // 滚动到底部，确保看到新添加的记录
      setTimeout(scrollToBottom, 100);
    }
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('调用AI服务失败:', error)
    isAiTyping.value = false
    messages.value.push({
      content: '抱歉，处理您的请求时出现了问题，请稍后再试。',
      isUser: false,
      timestamp: new Date().toISOString()
    })
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
  }
}

// 格式化账单金额
const formatAmount = (amount) => {
  const num = parseFloat(amount)
  return Math.abs(num).toFixed(2)
}

// 格式化账单日期
const formatLedgerDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    // 使用requestAnimationFrame确保在下一帧渲染后滚动
    requestAnimationFrame(() => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    })
  }
}

// 清除历史记录
const clearHistory = () => {
  if (confirm('确定要清除所有聊天记录吗？')) {
    messages.value = [
      {
        content: `<b>🤖 欢迎使用AI记账助手！</b><br>👉 您可以直接输入收支情况，例如：'今天午饭花了35元'<br>👉 或者查询报表，例如：'帮我分析本月的消费情况'<br>👉 也可以与我闲聊，我会以助手的身份回答您的问题~<br>`,
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]
    localStorage.setItem('ai_accounting_messages', JSON.stringify(messages.value))
  }
}
</script>

<style scoped>
.record-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px); /* 减去导航栏高度 */
  background-color: #f5f5f5;
  padding-bottom: 0px; /* 移除底部内边距，让输入框紧贴底部导航栏 */
}

.chat-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  margin-bottom: 8px;
  word-break: break-word;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  align-self: flex-end;
  background-color: #0084ff;
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-message {
  align-self: flex-start;
  background-color: white;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-content {
  margin: 0;
}

.message-content p {
  margin: 0;
  line-height: 1.4;
}

.input-container {
  display: flex;
  padding: 10px 12px;
  border-top: 1px solid #e0e0e0;
  background-color: white;
  margin-bottom: 0; /* 确保底部没有边距 */
}

.clear-button {
  height: 44px;
  width: 44px;
  border-radius: 22px;
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
  font-size: 18px;
  cursor: pointer;
  margin-right: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.clear-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

textarea {
  flex: 1;
  height: 44px;
  padding: 12px;
  border-radius: 22px;
  border: 1px solid #e0e0e0;
  resize: none;
  outline: none;
  margin-right: 8px;
  font-size: 16px;
  max-height: 100px;
}

.send-button {
  width: 70px;
  height: 44px;
  border-radius: 22px;
  background-color: #0084ff;
  color: white;
  border: none;
  font-weight: bold;
  cursor: pointer;
}

.send-button:disabled {
  background-color: #cccccc;
}

/* AI正在输入的动画 */
.typing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.typing-indicator span {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #999;
  margin: 0 2px;
  animation: bounce 1.3s linear infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

/* AI启动中的动画 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

.loading-indicator span {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #0084ff;
  margin: 0 3px;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-indicator span:nth-child(2) {
  animation-delay: 0.3s;
}

.loading-indicator span:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.error-message {
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #d00;
}

/* 记账卡片样式 */
.ledger-message {
  max-width: 90%;
  background: none;
  padding: 0;
  margin-bottom: 4px; /* 减小相邻记账卡片之间的距离 */
}

.ledger-card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
  border: 1px solid #e0e0e0;
  position: relative;
  margin-top: 8px;
  margin-bottom: 8px;
  transition: transform 0.2s ease;
}

.ledger-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.ledger-header {
  background-color: #f2f8ff;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
}

.ledger-icon {
  margin-right: 6px;
}

.ledger-status {
  font-weight: bold;
  margin-right: 4px;
}

.ledger-body {
  display: flex;
  padding: 12px;
  align-items: center;
}

.ledger-category-icon {
  font-size: 24px;
  margin-right: 12px;
}

.ledger-info {
  flex: 1;
}

.ledger-category {
  font-weight: bold;
  margin-bottom: 4px;
}

.ledger-desc {
  font-size: 13px;
  color: #666;
}

.ledger-amount {
  font-weight: bold;
  font-size: 16px;
  color: #f44336;
}

.ledger-amount .income {
  color: #4caf50;
}

/* 对话分隔符样式 */
.conversation-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  width: 100%;
}

.divider-line {
  height: 1px;
  width: 70%;
  background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.1), transparent);
}
</style>
