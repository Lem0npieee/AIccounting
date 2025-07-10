# AIccounting 手机版

这是AIccounting（AI记账）的手机移动端应用程序。该应用使用Vue3和Cordova构建，采用SQLite进行本地数据存储，让您可以随时随地记录和管理个人财务。

## 主要功能

- 聊天式记账：通过自然语言输入进行智能记账
- 明细查看：按日期查看收支明细
- 图表分析：可视化展示收支数据，支持多种图表
- 离线存储：使用SQLite本地数据库存储所有数据，保护隐私

## 技术栈

- 前端：Vue 3, Chart.js
- 数据存储：SQLite (Cordova-sqlite-storage)
- AI功能：DeepSeek API
- 构建工具：Vite
- 移动端封装：Cordova

## 项目结构

```
app-mobile/
├── config.xml          # Cordova配置文件
├── package.json        # 项目配置和依赖
├── vite.config.js      # Vite构建配置
├── src/                # 源代码目录
│   ├── assets/         # 静态资源
│   ├── components/     # Vue组件
│   ├── router/         # 路由配置
│   ├── services/       # 服务类（API、数据库等）
│   ├── views/          # 页面视图
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
└── www/                # 构建输出目录
```

## 构建和使用

### 开发模式

```bash
npm install
npm run dev
```

### 构建APK

```bash
npm run build
`cordova build android --debug --gradle-args="build bundleRelease"`
```

生成的APK位于 `platforms/android/app/build/outputs/apk/debug/app-debug.apk`
