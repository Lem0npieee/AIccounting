#!/bin/bash
# 初始化Cordova项目脚本

echo "开始设置Cordova项目..."

# 确保已经安装了Cordova
if ! command -v cordova &> /dev/null
then
    echo "Cordova未安装，请先运行 npm install -g cordova"
    exit 1
fi

# 创建Cordova项目
echo "创建Cordova项目结构..."
cd "$(dirname "$0")"
cd ..

# 添加Android平台
echo "添加Android平台..."
cordova platform add android

# 添加SQLite插件
echo "添加SQLite插件..."
cordova plugin add cordova-sqlite-storage

# 构建项目
echo "构建项目..."
npm run build

# 构建Android应用
echo "构建Android应用..."
cordova build android

echo "设置完成!"
echo "您可以使用以下命令启动应用:"
echo "cordova run android"
