# AIccounting - AI智能记账助手

<p align="center">
  <img src="文档/image/logo.png" alt="AIccounting Logo" width="200"/>
</p>

<p align="center">
  <b>通过AI交互，让记账更简单、财务分析更智能</b>
</p>

## 📑 项目概述

AIccounting 是一款基于 AI 交互的智能记账与财务分析应用，支持网页端和移动端。用户可通过自然语言对话完成记账、查询财务数据、生成财务报告和可视化分析，实现个人财务的智能化管理。

### 🎯 核心特性

- **自然语言记账**：通过对话方式轻松记录收支，无需复杂操作
- **多维度数据分析**：支持按日/周/月/年等多种维度查看财务状况
- **可视化图表**：直观展示收支趋势、消费结构等关键财务指标
- **智能财务建议**：基于消费模式提供个性化财务管理建议
- **跨平台支持**：同时支持网页端和移动端，数据互通共享

## 🔍 系统架构

AIccounting 采用前后端分离架构，主要组件包括：

- **前端**：Vue.js 构建的网页端 + 基于 Cordova 的移动端
- **后端**：Python Flask API 服务
- **AI服务**：自然语言处理与理解
- **数据存储**：MySQL 关系型数据库

### 🗃️ 项目结构

```
AIccounting/
├── AIccounting-main/     # 后端核心代码
│   ├── api.py            # API接口
│   ├── chat.py           # AI交互模块
│   ├── sql.py            # 数据库操作
│   ├── main.py           # 命令行入口
│   └── tests/            # 单元测试
├── App/                  # 网页端前端
│   ├── src/              # 源代码
│   │   ├── components/   # 组件
│   │   ├── views/        # 页面
│   │   └── api/          # 接口
│   └── static/           # 静态资源
└── App-Mobile/           # 移动端应用
    ├── src/              # 源代码
    ├── platforms/        # 平台特定代码
    └── www/              # 编译输出
```

## 🚀 开始使用

### 环境要求

- **Python**: 3.8+ (推荐使用虚拟环境)
- **Node.js**: 16+
- **MySQL**: 8.0+
- **移动端开发**：Android SDK (可选)

### 安装步骤

#### 1. 克隆仓库

```bash
git clone <repository-url>
cd AIccounting
```

#### 2. 配置数据库

- 安装并启动 MySQL 服务
- 创建名为 `data` 的数据库
- 确保数据库配置与 `api.py` 中一致(默认配置如下)：

```python
host="localhost"
port=3306
user="root"
password="512560"
db="data"
```

#### 3. 安装后端依赖

```bash
cd AIccounting-main
pip install flask flask-cors mysqlclient requests pandas numpy matplotlib tqdm
```

#### 4. 安装网页端依赖

```bash
cd ../App
npm install
```

### 启动服务

#### 1. 启动后端API服务

```bash
cd AIccounting-main
python api.py
```

服务将在 http://localhost:5000 启动

#### 2. 启动网页前端

```bash
cd ../App
npm run dev
```

前端将在 http://localhost:8080 启动

### 移动端开发

#### 环境配置

```bash
cd ../App-Mobile
npm install
```

#### 添加Android平台

```bash
cd ../App-Mobile
npx cordova platform add android
```

#### 构建并运行

```bash
npm run build
npx cordova run android
```

## 📱 移动端特性

- 离线记账功能
- SQLite本地数据存储
- 数据同步机制
- 适配移动设备的UI交互

## 💡 常见问题

### Windows PowerShell执行策略

如遇到PowerShell执行npm脚本权限问题，请执行：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 数据库连接问题

确保MySQL服务已启动，并检查`api.py`中的连接配置是否正确。

### 端口占用

如默认端口(5000或8080)被占用，可在相应配置文件中修改。

## 🧪 测试

运行后端测试：

```bash
cd AIccounting-main/tests
python run_tests.py
```

运行前端测试：

```bash
cd App/test
npm run test
```

## 📄 项目文档

- [需求分析报告](文档/需求分析报告%20new.md)
- [架构设计文档](文档/AI记账-架构设计文档.pdf)
- [软件测试报告](文档/软件测试与质量保证报告.md)
- [用户手册](使用说明.md)

## 📊 技术栈

- **前端**: Vue.js, Vue Router, Axios, ECharts
- **移动端**: Cordova
- **后端**: Python, Flask, Flask-CORS
- **数据库**: MySQL, LocalForage
- **AI服务**: DeepSeek API

---

© 2025 AIccounting Team. All rights reserved.