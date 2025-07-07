#!/usr/bin/env node
// filepath: c:\Users\26791\Documents\AIccounting-main\AIccounting-main\App\test\run-tests.js

const { spawn } = require('child_process')
const path = require('path')

// 测试配置
const testConfigs = {
  unit: {
    description: '单元测试 - 测试单个组件功能',
    command: 'npx',
    args: ['jest', '--config=test/unit/jest.conf.js', 'test/unit/specs']
  },
  integration: {
    description: '集成测试 - 测试组件间交互',
    command: 'npx',
    args: ['jest', '--config=test/unit/jest.conf.js', 'test/integration']
  },
  all: {
    description: '全部测试 - 运行所有测试用例',
    command: 'npx',
    args: ['jest', '--config=test/unit/jest.conf.js']
  },
  watch: {
    description: '监听模式 - 文件变化时自动运行测试',
    command: 'npx',
    args: ['jest', '--config=test/unit/jest.conf.js', '--watch']
  },
  coverage: {
    description: '覆盖率测试 - 生成测试覆盖率报告',
    command: 'npx',
    args: ['jest', '--config=test/unit/jest.conf.js', '--coverage']
  },
  ci: {
    description: 'CI测试 - 持续集成环境测试',
    command: 'npx',
    args: ['jest', '--config=test/unit/jest.conf.js', '--ci', '--coverage', '--watchAll=false']
  }
}

// 获取命令行参数
const testType = process.argv[2] || 'all'
const config = testConfigs[testType]

if (!config) {
  console.error(`❌ 未知的测试类型: ${testType}`)
  console.log('\n可用的测试类型:')
  Object.entries(testConfigs).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(12)} - ${value.description}`)
  })
  process.exit(1)
}

console.log(`🚀 开始运行: ${config.description}`)
console.log(`📝 命令: ${config.command} ${config.args.join(' ')}\n`)

// 运行测试 - Windows 兼容性修复
const isWindows = process.platform === 'win32'
const command = isWindows && config.command === 'npx' ? 'npx.cmd' : config.command
const testProcess = spawn(command, config.args, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  shell: isWindows
})

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ 测试执行完成!')
    
    // 如果是覆盖率测试，提供报告链接
    if (testType === 'coverage' || testType === 'ci') {
      console.log('📊 覆盖率报告生成在: test/unit/coverage/lcov-report/index.html')
    }
  } else {
    console.log(`\n❌ 测试执行失败，退出代码: ${code}`)
    process.exit(code)
  }
})

testProcess.on('error', (error) => {
  console.error(`❌ 执行测试时出错: ${error.message}`)
  process.exit(1)
})
