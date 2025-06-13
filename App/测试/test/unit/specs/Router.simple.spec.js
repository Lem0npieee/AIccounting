import Vue from 'vue'
import Router from 'vue-router'
import router from '@/router'

Vue.use(Router)

describe('Router配置测试', () => {
  it('应该正确配置路由', () => {
    expect(router).toBeDefined()
    expect(router.options.routes).toBeDefined()
  })

  it('应该包含正确的路由配置', () => {
    const routes = router.options.routes
    expect(routes.length).toBeGreaterThan(0)
    
    // 检查根路径重定向
    const rootRoute = routes.find(route => route.path === '/')
    expect(rootRoute).toBeDefined()
    expect(rootRoute.redirect).toBe('/details')
    
    // 检查详情页路由
    const detailsRoute = routes.find(route => route.path === '/details')
    expect(detailsRoute).toBeDefined()
    expect(detailsRoute.name).toBe('Details')
    
    // 检查记账页路由
    const recordRoute = routes.find(route => route.path === '/record')
    expect(recordRoute).toBeDefined()
    expect(recordRoute.name).toBe('Record')
    
    // 检查图表页路由
    const chartRoute = routes.find(route => route.path === '/chart')
    expect(chartRoute).toBeDefined()
    expect(chartRoute.name).toBe('Chart')
  })

  it('应该能够正确导航到各个页面', async () => {
    // 测试导航到详情页
    await router.push('/details')
    expect(router.currentRoute.path).toBe('/details')
    expect(router.currentRoute.name).toBe('Details')
    
    // 测试导航到记账页
    await router.push('/record')
    expect(router.currentRoute.path).toBe('/record')
    expect(router.currentRoute.name).toBe('Record')
    
    // 测试导航到图表页
    await router.push('/chart')
    expect(router.currentRoute.path).toBe('/chart')
    expect(router.currentRoute.name).toBe('Chart')
  })

  it('根路径应该重定向到详情页', async () => {
    await router.push('/')
    expect(router.currentRoute.path).toBe('/details')
  })

  it('未知路径应该能够处理', async () => {
    try {
      await router.push('/nonexistent')
      // 如果没有配置404页面，路由可能会保持在当前页面或导航到默认页面
    } catch (error) {
      // 如果路由导航失败，这是正常的
      expect(error).toBeDefined()
    }
  })

  it('路由组件应该正确加载', () => {
    const routes = router.options.routes
    
    routes.forEach(route => {
      if (route.component && route.path !== '/') {
        expect(route.component).toBeDefined()
        // 确保组件是一个有效的Vue组件或异步组件
        expect(typeof route.component === 'object' || typeof route.component === 'function').toBe(true)
      }
    })
  })

  it('命名路由应该正常工作', async () => {
    // 通过名称导航
    await router.push({ name: 'Details' })
    expect(router.currentRoute.name).toBe('Details')
    
    await router.push({ name: 'Record' })
    expect(router.currentRoute.name).toBe('Record')
    
    await router.push({ name: 'Chart' })
    expect(router.currentRoute.name).toBe('Chart')
  })

  it('路由历史应该正常工作', async () => {
    // 清空历史
    await router.push('/details')
    
    // 导航到不同页面
    await router.push('/record')
    await router.push('/chart')
    
    // 后退操作
    await router.go(-1)
    expect(router.currentRoute.path).toBe('/record')
    
    await router.go(-1)
    expect(router.currentRoute.path).toBe('/details')
  })
})
