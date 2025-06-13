import { config } from '@vue/test-utils'

// 全局配置Vue Test Utils
config.stubs = {
  // 存根常用的第三方组件
  'router-link': true,
  'router-view': true,
  'transition': true,
  'transition-group': true
}

// Mock全局对象
global.console = {
  ...console,
  // 在测试中静默某些控制台输出
  warn: jest.fn(),
  error: jest.fn()
}

// Mock window对象
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

// 确保localStorage在global和window对象上都可用
global.localStorage = localStorageMock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {}
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: jest.fn((key) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

// 确保sessionStorage在global和window对象上都可用
global.sessionStorage = sessionStorageMock
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
})

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn()

// Mock Chart.js如果使用了图表库 - 可选的mock
try {
  jest.doMock('chart.js', () => ({
    Chart: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
      update: jest.fn(),
      render: jest.fn(),
    })),
    registerables: [],
  }), { virtual: true })
} catch (e) {
  // Chart.js 不存在时忽略
}

// 测试工具函数
global.flushPromises = () => new Promise(resolve => setImmediate(resolve))

// 导出清理函数供测试文件使用
global.cleanupMocks = () => {
  jest.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
}
