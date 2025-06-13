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

        <!-- 动态消息列表 -->
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="[
            'message',
            message.isUser ? 'user-message' : 'ai-message',
            message.type === 'ledger' ? 'ledger-message' : '',
          ]"
        >
          <template v-if="message.type === 'ledger' && message.ledgerEntry">
            <div class="ledger-card">
              <div class="ledger-header">
                <span class="ledger-icon">💴</span>
                <span class="ledger-status">已记录：</span>
                <span class="ledger-date">{{
                  formatLedgerDate(message.ledgerEntry.time)
                }}</span>
              </div>
              <div class="ledger-body">
                <div class="ledger-category-icon">
                  {{
                    getCategoryIcon(message.ledgerEntry.categoryTag || "其他")
                  }}
                </div>
                <div class="ledger-info">
                  <div class="ledger-category">
                    {{ message.ledgerEntry.categoryTag || "其他" }}
                  </div>
                  <div class="ledger-desc">
                    {{ message.ledgerEntry.specificName || "未命名项目" }}
                  </div>
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
          :disabled="
            !userInput.trim() ||
            isAiTyping ||
            aiStarting ||
            !aiStarted ||
            startupError
          "
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "Record",
  data() {
    return {
      userInput: "",
      messages: [], // 初始化为空，后续从localStorage加载
      isAiTyping: false,
      apiBaseUrl: "http://localhost:5000",
      aiStarted: false, // AI助手是否已启动
      aiStarting: false, // AI启动中
      startupError: null, // 启动错误信息
    };
  },
  watch: {
    messages: {
      handler(newVal) {
        localStorage.setItem("ai_accounting_messages", JSON.stringify(newVal));
      },
      deep: true,
    },
  },
  methods: {
    // 启动AI助手
    startAiAssistant() {
      this.aiStarting = true;
      this.startupError = null;

      // 调用后端API启动AI
      axios
        .post(`${this.apiBaseUrl}/api/start`)
        .then((response) => {
          if (response.data.success) {
            this.aiStarted = true;
            console.log("AI启动成功:", response.data.message);
            // 不再自动请求AI助手的问候语
          } else {
            // 如果启动失败，但返回了其他信息，可能是临时问题，等待一段时间后重试
            console.log("AI启动中:", response.data.message);
            setTimeout(() => this.checkAiStatus(), 5000);
          }
        })
        .catch((error) => {
          this.startupError =
            (error.response &&
              error.response.data &&
              error.response.data.error) ||
            "无法连接到服务器";
          console.error("AI启动失败:", error);
        })
        .finally(() => {
          this.aiStarting = false;
        });
    },

    // 检查AI助手启动状态
    checkAiStatus() {
      axios
        .post(`${this.apiBaseUrl}/api/start`)
        .then((response) => {
          if (response.data.success) {
            this.aiStarted = true;
            console.log("AI启动成功:", response.data.message);
          } else {
            this.startupError = "无法启动AI记账助手，请刷新页面或联系管理员。";
          }
        })
        .catch((error) => {
          this.startupError =
            (error.response &&
              error.response.data &&
              error.response.data.error) ||
            "无法连接到服务器";
          console.error("AI状态检查失败:", error);
        })
        .finally(() => {
          this.aiStarting = false;
        });
    },

    // 发送消息
    sendMessage() {
      const message = this.userInput.trim();
      if (!message) return;

      // 检查AI助手是否已启动
      if (!this.aiStarted) {
        this.startAiAssistant();
        return;
      }

      // 添加用户消息到界面
      this.messages.push({
        content: message,
        isUser: true,
        timestamp: new Date().toISOString(),
      });

      // 清空输入框
      this.userInput = "";

      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });

      // 设置AI正在输入状态
      this.isAiTyping = true;

      // 直接调用后端API
      this.callBackendAPI(message);
    },

    // 调用后端API
    callBackendAPI(userMessage) {
      axios
        .post(`${this.apiBaseUrl}/api/chat`, {
          message: userMessage,
        })
        .then((response) => {
          const aiResponse = response.data;

          // 将AI回复添加到消息列表
          this.messages.push({
            content: aiResponse.replyText,
            isUser: false,
            timestamp: new Date().toISOString(),
          });

          // 检查是否包含敏感内容提示
          const sensitiveContentDetected =
            aiResponse.replyText.includes("不适当的内容") ||
            aiResponse.replyText.includes("敏感内容") ||
            aiResponse.replyText.includes("非法") ||
            aiResponse.replyText.includes("抱歉，您的消息") ||
            aiResponse.replyText.includes("重新输入");          // 如果有记账信息，且没有检测到敏感内容，则显示记账卡片
          if ((aiResponse.ledgerEntries || aiResponse.ledgerEntry) && !sensitiveContentDetected) {
            // 兼容处理单条和多条记账信息
            const entries = aiResponse.ledgerEntries || [aiResponse.ledgerEntry];
            
            // 为每条记账信息创建一个卡片
            entries.forEach(entry => {
              if (entry) {
                this.messages.push({
                  type: "ledger",
                  isUser: false,
                  ledgerEntry: entry,
                  timestamp: new Date().toISOString(),
                });
              }
            });

            this.$nextTick(() => {
              this.scrollToBottom();
            });

            // 不再调用/api/entries，避免重复保存
            console.log("记账信息已在后端保存，无需重复保存");
          }

          // 滚动到底部
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        })
        .catch((error) => {
          console.error("调用AI服务失败:", error);
          // 显示错误消息
          this.messages.push({
            content: "抱歉，AI服务暂时不可用，请稍后再试。",
            isUser: false,
            timestamp: new Date().toISOString(),
          });
        })
        .finally(() => {
          this.isAiTyping = false;
        });
    },

    // 滚动到底部
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      container.scrollTop = container.scrollHeight;
    },
    getCategoryIcon(category) {
      const icons = {
        // 收入类
        工资: "💰",
        奖金: "🏆",
        补贴: "💵",
        兼职: "💼",
        投资: "📈",
        其他收入: "📝",

        // 支出类
        餐饮: "🍔",
        购物: "🛍️",
        交通: "🚗",
        住房: "🏠",
        娱乐: "🎭",
        教育: "📚",
        医疗: "💊",
        日用品: "🧻",
        其他支出: "📝",
      };
      return icons[category] || "📝";
    },
    formatLedgerDate(time) {
      if (!time) return "";
      const d = new Date(time);
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, "0");
      const day = d.getDate().toString().padStart(2, "0");
      return `${y}年${m}月${day}日`;
    },
    // 格式化金额显示
    formatAmount(amount) {
      // 确保amount是数字，如果无法转换则默认为0
      let num = 0;
      try {
        num = parseFloat(amount);
        if (isNaN(num)) num = 0;
      } catch (e) {
        num = 0;
      }
      return num.toFixed(1);
    },
  },
  mounted() {
    // 加载历史消息
    const saved = localStorage.getItem("ai_accounting_messages");
    if (saved) {
      this.messages = JSON.parse(saved);
    } else {
      this.messages = [
        {
          content: `<b>🤖 欢迎使用AI记账助手！</b><br>👉 您可以直接输入收支情况，例如：'今天午饭花了35元'<br>👉 或者查询报表，例如：'帮我分析本月的消费情况'<br>👉 也可以与我闲聊，我会以助手的身份回答您的问题~<br>`,
          isUser: false,
          timestamp: new Date().toISOString(),
        },
      ];
    }
    this.startAiAssistant();
    this.$nextTick(() => {
      this.scrollToBottom();
    });
  },
};
</script>

<style scoped>
.record-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  padding-bottom: 50px; /* 留出底部导航栏的空间 */
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
  margin-bottom: 10px;
}

.ai-message {
  align-self: flex-start;
  max-width: 80%;
}

.user-message {
  align-self: flex-end;
  max-width: 80%;
}

.message-content {
  padding: 10px 15px;
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.ai-message .message-content {
  background-color: #fff;
}

.user-message .message-content {
  background-color: #409eff;
  color: white;
}

.error-message .message-content {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}

.message-content p {
  margin: 0;
  line-height: 1.5;
}

.input-container {
  display: flex;
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
}

textarea {
  flex: 1;
  height: 40px;
  max-height: 100px;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 10px 15px;
  resize: none;
  outline: none;
  font-family: inherit;
  font-size: 14px;
}

textarea:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.send-button {
  width: 60px;
  margin-left: 10px;
  border: none;
  background-color: #409eff;
  color: white;
  border-radius: 20px;
  cursor: pointer;
}

.send-button:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

/* 打字指示器样式 */
.typing-indicator,
.loading-indicator {
  display: flex;
  align-items: center;
}

.typing-indicator span,
.loading-indicator span {
  height: 8px;
  width: 8px;
  background-color: #409eff;
  border-radius: 50%;
  display: inline-block;
  margin-right: 5px;
  animation: typing 1s infinite ease-in-out;
}

.loading-indicator span {
  background-color: #67c23a;
}

.typing-indicator span:nth-child(1),
.loading-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2),
.loading-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3),
.loading-indicator span:nth-child(3) {
  animation-delay: 0.4s;
  margin-right: 0;
}

@keyframes typing {
  0% {
    transform: translateY(0px);
    background-color: #409eff;
  }
  28% {
    transform: translateY(-5px);
    background-color: #67c23a;
  }
  44% {
    transform: translateY(0px);
    background-color: #409eff;
  }
}

.ledger-message {
  background: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin-bottom: 18px;
}
.ledger-card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.1);
  padding: 18px 20px 16px 20px;
  margin: 0 auto;
  min-width: 260px;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  font-size: 16px;
  color: #333;
}
.ledger-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  font-size: 15px;
  color: #888;
}
.ledger-icon {
  font-size: 20px;
  margin-right: 6px;
}
.ledger-status {
  font-weight: 500;
  margin-right: 8px;
}
.ledger-date {
  font-size: 14px;
  color: #bbb;
  margin-left: auto;
}
.ledger-body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ledger-category-icon {
  font-size: 32px;
  margin-right: 10px;
}
.ledger-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ledger-category {
  font-size: 17px;
  font-weight: 600;
  color: #222;
}
.ledger-desc {
  font-size: 15px;
  color: #666;
}
.ledger-amount {
  font-size: 22px;
  font-weight: bold;
  color: #222;
  margin-left: 10px;
  min-width: 80px;
  text-align: right;
}
</style>