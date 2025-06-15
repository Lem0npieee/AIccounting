@echo off
REM 初始化Cordova项目脚本

echo 开始设置Cordova项目...

REM 确保已经安装了Cordova
where cordova >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Cordova未安装，请先运行 npm install -g cordova
    exit /b 1
)

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 添加Android平台
echo 添加Android平台...
call cordova platform add android

REM 添加SQLite插件
echo 添加SQLite插件...
call cordova plugin add cordova-sqlite-storage

REM 构建项目
echo 构建项目...
call npm run build

REM 构建Android应用
echo 构建Android应用...
call cordova build android

echo 设置完成!
echo 您可以使用以下命令启动应用:
echo cordova run android
