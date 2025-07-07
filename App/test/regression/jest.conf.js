const path = require('path')

module.exports = {
  rootDir: path.resolve(__dirname, '../../'),
  displayName: 'Regression Tests',
  moduleFileExtensions: [
    'js',
    'json',
    'vue'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.js$': '<rootDir>/node_modules/babel-jest',
    '.*\\.(vue)$': '<rootDir>/node_modules/vue-jest'
  },
  testMatch: [
    '<rootDir>/test/regression/specs/**/*.spec.js'
  ],
  testEnvironment: 'jsdom',
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  setupFiles: ['<rootDir>/test/unit/setupTests.js'],
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: '<rootDir>/test/regression/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,vue}',
    '!src/main.js',
    '!src/router/index.js',
    '!**/node_modules/**'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  verbose: true,
  // 配置为只运行通过的稳定测试
  testNamePattern: '^(?!.*\\.skip).*$',
  // 确保测试运行的超时时间
  testTimeout: 10000
}
