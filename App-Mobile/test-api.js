/**
 * DeepSeek API 测试工具
 * 
 * 这个脚本用于测试与DeepSeek API的连接
 * 运行方法: node test-api.js
 */
const axios = require('axios');

// DeepSeek API密钥 - 请替换为您的实际API密钥
const DEEPSEEK_API_KEY = "sk-3b7ab35452b34c22b825f7d617501fd8";
// DeepSeek API 端点
const API_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * 测试DeepSeek API连接
 */
async function testDeepSeekAPI() {
  try {
    console.log("正在测试DeepSeek API连接...");
    
    // 构建请求数据 - 按照DeepSeek官方文档格式
    const data = {
      model: "deepseek-chat", // 使用DeepSeek-V3模型
      messages: [
        { role: "system", content: "你是AI助手，请简短回答。" },
        { role: "user", content: "你好，请用一句话介绍自己。" }
      ],
      temperature: 0,
      max_tokens: 100
    };
    
    // 设置API请求选项 - 根据官方文档
    const requestOptions = {
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 30000 // 30秒超时
    };
    
    console.log("发送API请求...");
    const response = await axios.post(API_URL, data, requestOptions);
    
    console.log("API响应状态:", response.status);
    console.log("API响应数据:", response.data);
    
    if (response.status === 200) {
      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        console.log("\n测试成功! API回复: ", response.data.choices[0].message.content);
      } else {
        console.error("\n测试失败: API响应格式不正确");
      }
    } else {
      console.error("\n测试失败: API返回非200状态码");
    }
  } catch (error) {
    console.error("\n测试失败: 发生错误");
    
    if (error.response) {
      console.error("服务器响应错误:", error.response.status);
      console.error("错误数据:", error.response.data);
    } else if (error.request) {
      console.error("请求发送但无响应");
    } else {
      console.error("请求配置错误:", error.message);
    }
  }
}

// 执行测试
testDeepSeekAPI();
