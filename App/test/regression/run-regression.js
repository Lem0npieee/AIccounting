#!/usr/bin/env node

/**
 * 回归测试运行器
 * 运行所有稳定的、通过的测试用例，确保核心功能不被破坏
 */

const { exec } = require('child_process')
const path = require('path')

const configPath = path.resolve(__dirname, 'jest.conf.js')

console.log('🔄 开始运行回归测试...')
console.log('📂 测试配置文件:', configPath)
console.log('📊 测试范围: 记账页面、明细页面、图表分析页面核心功能')
console.log('')

// 运行回归测试
const testCommand = `npx jest --config "${configPath}" --colors --verbose`

exec(testCommand, { cwd: path.resolve(__dirname, '../../') }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ 回归测试执行出错:', error)
    process.exit(1)
  }

  console.log(stdout)
  
  if (stderr) {
    console.warn('⚠️  警告信息:', stderr)
  }

  // 检查测试结果 - 更精确的匹配模式
  const testSuitesMatch = stdout.match(/Test Suites:\s*(\d+)\s*passed,?\s*(\d+)?\s*failed?,?\s*(\d+)\s*total/)
  const testsMatch = stdout.match(/Tests:\s*(\d+)\s*passed,?\s*(\d+)?\s*failed?,?\s*(\d+)\s*total/)
  
  if (testSuitesMatch && testsMatch) {
    const suitesTotal = parseInt(testSuitesMatch[3] || testSuitesMatch[1])
    const suitesPassed = parseInt(testSuitesMatch[1])
    const testsTotal = parseInt(testsMatch[3] || testsMatch[1])
    const testsPassed = parseInt(testsMatch[1])
    
    console.log(`\n📈 回归测试结果统计:`)
    console.log(`   测试套件: ${suitesPassed}/${suitesTotal} 通过`)
    console.log(`   测试用例: ${testsPassed}/${testsTotal} 通过`)
    
    
  } else {
    
  }
})
