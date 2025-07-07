import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 样式文件
import './assets/css/styles.css'

// 创建Vue应用
const app = createApp(App)

// 使用路由
app.use(router)

// Cordova初始化
document.addEventListener('deviceready', onDeviceReady, false)

function onDeviceReady() {
  console.log('Cordova is ready!')
  // 应用挂载
  app.mount('#app')
}

// 在浏览器环境中也能运行
if (!window.cordova) {
  console.log('Running in browser, not waiting for Cordova')
  app.mount('#app')
}
