import { shallowMount, createLocalVue } from '@vue/test-utils'
import Router from 'vue-router'
import TabBar from '@/components/common/TabBar'

const localVue = createLocalVue()
localVue.use(Router)

// Mock router
const router = new Router({
  routes: [
    { path: '/details', name: 'Details', component: { template: '<div>Details</div>' } },
    { path: '/record', name: 'Record', component: { template: '<div>Record</div>' } },
    { path: '/chart', name: 'Chart', component: { template: '<div>Chart</div>' } }
  ]
})

describe('TabBar.vue', () => {
  let wrapper

  beforeEach(async () => {
    // 确保每次测试开始时都从一个干净的路由状态开始
    await router.push('/record').catch(() => {})
    wrapper = shallowMount(TabBar, {
      localVue,
      router
    })
  })

  it('应该正确渲染组件', () => {
    expect(wrapper.find('.tab-bar').exists()).toBe(true)
  })

  it('应该渲染所有导航标签', () => {
    const tabItems = wrapper.findAll('.tab-item')
    expect(tabItems).toHaveLength(3)
  })

  it('应该正确显示标签图标', () => {
    const icons = wrapper.findAll('.icon')
    expect(icons).toHaveLength(3)
  })

  it('应该包含正确的标签数据', () => {
    const tabs = wrapper.vm.tabs
    expect(tabs.length).toBe(3)
    expect(tabs[0].title).toBe('明细')
    expect(tabs[0].path).toBe('/details')
    expect(tabs[1].title).toBe('记账')
    expect(tabs[1].path).toBe('/record')
    expect(tabs[2].title).toBe('图表')
    expect(tabs[2].path).toBe('/chart')
  })
  
  it('应该正确显示标签标题', () => {
    const titles = wrapper.findAll('.tab-title')
    expect(titles).toHaveLength(3)
    expect(titles.at(0).text()).toBe('明细')
    expect(titles.at(1).text()).toBe('记账')
    expect(titles.at(2).text()).toBe('图表')
  })

  // 1. 基础渲染测试
  describe('基础渲染测试', () => {
    it('应该正确显示标签文字', () => {
      const labels = wrapper.findAll('.tab-title')
      expect(labels.length).toBe(3)
      expect(labels.at(0).text()).toBe('明细')
      expect(labels.at(1).text()).toBe('记账')
      expect(labels.at(2).text()).toBe('图表')
    })

    it('应该根据当前路由设置活动标签', async () => {
      // 切换到 /details 路由
      await router.push('/details').catch(() => {})
      await wrapper.vm.$nextTick()
      
      const detailsTab = wrapper.findAll('.tab-item').at(0)
      expect(detailsTab.classes()).toContain('active')
    })
  })

  // 2. 导航功能测试
  describe('导航功能测试', () => {
    it('点击标签应该切换路由', async () => {
      const routerPushSpy = jest.spyOn(wrapper.vm.$router, 'push').mockResolvedValue()
      const detailsTab = wrapper.findAll('.tab-item').at(0) // 第一个是明细标签
      
      await detailsTab.trigger('click')
      expect(routerPushSpy).toHaveBeenCalledWith('/details')
      routerPushSpy.mockRestore()
    })

    it('点击记账标签应该跳转到记账页面', async () => {
      const routerPushSpy = jest.spyOn(wrapper.vm.$router, 'push').mockResolvedValue()
      const recordTab = wrapper.findAll('.tab-item').at(1) // 第二个是记账标签
      
      await recordTab.trigger('click')
      expect(routerPushSpy).toHaveBeenCalledWith('/record')
      routerPushSpy.mockRestore()
    })

    it('点击图表标签应该跳转到图表页面', async () => {
      const routerPushSpy = jest.spyOn(wrapper.vm.$router, 'push').mockResolvedValue()
      const chartTab = wrapper.findAll('.tab-item').at(2) // 第三个是图表标签
      
      await chartTab.trigger('click')
      expect(routerPushSpy).toHaveBeenCalledWith('/chart')
      routerPushSpy.mockRestore()
    })
  })

  // 3. 视觉状态测试
  describe('视觉状态测试', () => {
    it('当前路由对应的标签应该有active样式', async () => {
      // 导航到明细页面
      await router.push('/details').catch(() => {})
      await wrapper.vm.$nextTick()
      
      const detailsTab = wrapper.findAll('.tab-item').at(0)
      expect(detailsTab.classes()).toContain('active')
    })

    it('非当前路由的标签不应该有active样式', async () => {
      // 导航到明细页面
      await router.push('/details').catch(() => {})
      await wrapper.vm.$nextTick()
      
      const recordTab = wrapper.findAll('.tab-item').at(1)
      const chartTab = wrapper.findAll('.tab-item').at(2)
      
      expect(recordTab.classes()).not.toContain('active')
      expect(chartTab.classes()).not.toContain('active')
    })
  })

  // 4. 标签数据测试
  describe('标签数据测试', () => {
    it('应该包含正确的标签数据', () => {
      const tabs = wrapper.vm.tabs
      expect(tabs).toHaveLength(3)
      
      expect(tabs[0]).toEqual({
        title: '明细',
        path: '/details',
        icon: 'icon-details'
      })
      
      expect(tabs[1]).toEqual({
        title: '记账',
        path: '/record',
        icon: 'icon-record'
      })
      
      expect(tabs[2]).toEqual({
        title: '图表',
        path: '/chart',
        icon: 'icon-chart'
      })
    })
  })

  // 5. 图标显示测试
  describe('图标显示测试', () => {
    it('应该正确显示图标类名', () => {
      const icons = wrapper.findAll('.icon i')
      expect(icons.at(0).classes()).toContain('icon-details')
      expect(icons.at(1).classes()).toContain('icon-record')
      expect(icons.at(2).classes()).toContain('icon-chart')
    })
  })

  // 6. 组件结构测试
  describe('组件结构测试', () => {
    it('应该有正确的DOM结构', () => {
      expect(wrapper.find('.tab-bar').exists()).toBe(true)
      expect(wrapper.findAll('.tab-item')).toHaveLength(3)
      
      const firstTab = wrapper.findAll('.tab-item').at(0)
      expect(firstTab.find('.icon').exists()).toBe(true)
      expect(firstTab.find('.tab-title').exists()).toBe(true)
    })

    it('每个标签项都应该有正确的点击处理', async () => {
      const routerPushSpy = jest.spyOn(wrapper.vm.$router, 'push').mockResolvedValue()
      
      for (let i = 0; i < 3; i++) {
        const tab = wrapper.findAll('.tab-item').at(i)
        await tab.trigger('click')
      }
      
      expect(routerPushSpy).toHaveBeenCalledTimes(3)
      routerPushSpy.mockRestore()
    })
  })

  // 7. 路由响应测试
  describe('路由响应测试', () => {
    it('路由变化时应该更新active状态', async () => {
      // 初始状态 - 已经在 /record
      await wrapper.vm.$nextTick()
      
      let activeTab = wrapper.find('.tab-item.active')
      expect(activeTab.find('.tab-title').text()).toBe('记账')
      
      // 切换到图表页面
      await router.push('/chart').catch(() => {})
      await wrapper.vm.$nextTick()
      
      activeTab = wrapper.find('.tab-item.active')
      expect(activeTab.find('.tab-title').text()).toBe('图表')
    })
  })
})
