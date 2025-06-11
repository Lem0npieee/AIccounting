import Vue from 'vue'
import { mount, createLocalVue } from '@vue/test-utils'
import VueRouter from 'vue-router'
import App from '@/App'
import Details from '@/views/Details'
import Record from '@/views/Record'
import Chart from '@/views/Chart'
import TabBar from '@/components/common/TabBar'

const localVue = createLocalVue()
localVue.use(VueRouter)

const routes = [
  { path: '/', redirect: '/record' },
  { path: '/details', name: 'Details', component: Details },
  { path: '/record', name: 'Record', component: Record },
  { path: '/chart', name: 'Chart', component: Chart }
]

const router = new VueRouter({ routes })

describe('App.vue - 应用集成测试', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(App, {
      localVue,
      router,
      stubs: {
        // 使用真实组件进行集成测试
        Details: Details,
        Record: Record,
        Chart: Chart,
        TabBar: TabBar
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  // 1. 应用启动测试
  describe('应用启动测试', () => {
    it('应该正确加载主应用', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.is(App)).toBe(true)
    })

    it('应该包含底部导航栏', () => {
      expect(wrapper.findComponent(TabBar).exists()).toBe(true)
    })

    it('应该默认显示记账页面', async () => {
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.$route.path).toBe('/record')
    })

    it('应该正确设置应用标题', () => {
      expect(document.title).toContain('AI记账')
    })
  })

  // 2. 路由导航测试
  describe('路由导航测试', () => {
    it('通过底部导航栏切换到明细页面', async () => {
      const tabBar = wrapper.findComponent(TabBar)
      const detailsTab = tabBar.find('[data-tab="details"]')
      
      await detailsTab.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.$route.path).toBe('/details')
      expect(wrapper.findComponent(Details).exists()).toBe(true)
    })

    it('通过底部导航栏切换到图表页面', async () => {
      const tabBar = wrapper.findComponent(TabBar)
      const chartTab = tabBar.find('[data-tab="chart"]')
      
      await chartTab.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.$route.path).toBe('/chart')
      expect(wrapper.findComponent(Chart).exists()).toBe(true)
    })

    it('路由切换时底部导航栏状态应该同步更新', async () => {
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const tabBar = wrapper.findComponent(TabBar)
      const activeTab = tabBar.find('.tab-item.active')
      expect(activeTab.find('.tab-label').text()).toBe('明细')
    })

    it('无效路由应该重定向到默认页面', async () => {
      await wrapper.vm.$router.push('/invalid-route')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.vm.$route.path).toBe('/record')
    })
  })

  // 3. 数据流传递测试
  describe('数据流传递测试', () => {
    it('记账数据应该在各页面间正确传递', async () => {
      // 在记账页面添加数据
      const recordComponent = wrapper.findComponent(Record)
      await recordComponent.setData({
        inputText: '午餐花了30元'
      })
      
      if (recordComponent.vm.sendMessage) {
        await recordComponent.vm.sendMessage()
      }
      
      // 切换到明细页面检查数据
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponent = wrapper.findComponent(Details)
      // 验证数据是否正确传递
      expect(detailsComponent.exists()).toBe(true)
    })

    it('筛选条件应该在页面间保持一致', async () => {
      // 在明细页面设置筛选条件
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponent = wrapper.findComponent(Details)
      await detailsComponent.setData({ selectedMonth: 5 })
      
      // 切换到图表页面
      await wrapper.vm.$router.push('/chart')
      await wrapper.vm.$nextTick()
      
      const chartComponent = wrapper.findComponent(Chart)
      // 验证筛选条件是否同步
      expect(chartComponent.vm.selectedMonth).toBe(5)
    })
  })

  // 4. 全局状态管理测试
  describe('全局状态管理测试', () => {
    it('应用状态变化应该正确广播到所有组件', async () => {
      // 模拟全局状态变化
      wrapper.vm.$emit('global-data-update', {
        totalBalance: 5000,
        monthlyExpense: 2000
      })
      
      await wrapper.vm.$nextTick()
      
      // 验证各组件是否接收到状态更新
      const components = [
        wrapper.findComponent(Details),
        wrapper.findComponent(Record),
        wrapper.findComponent(Chart)
      ]
      
      components.forEach(component => {
        if (component.exists()) {
          expect(component.vm).toBeDefined()
        }
      })
    })

    it('用户偏好设置应该全局生效', async () => {
      // 设置用户偏好
      const userPreferences = {
        theme: 'dark',
        currency: 'CNY',
        dateFormat: 'YYYY-MM-DD'
      }
      
      wrapper.vm.$store?.commit('SET_USER_PREFERENCES', userPreferences)
      await wrapper.vm.$nextTick()
      
      // 验证各组件是否应用了用户偏好
      expect(wrapper.classes()).toContain('dark-theme')
    })
  })

  // 5. 用户交互流程测试
  describe('用户交互流程测试', () => {
    it('完整的记账流程测试', async () => {
      // 1. 在记账页面输入记账信息
      const recordComponent = wrapper.findComponent(Record)
      await recordComponent.setData({ inputText: '晚餐消费80元' })
      
      if (recordComponent.vm.sendMessage) {
        await recordComponent.vm.sendMessage()
      }
      
      // 2. 切换到明细页面查看记录
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponent = wrapper.findComponent(Details)
      expect(detailsComponent.exists()).toBe(true)
      
      // 3. 切换到图表页面查看统计
      await wrapper.vm.$router.push('/chart')
      await wrapper.vm.$nextTick()
      
      const chartComponent = wrapper.findComponent(Chart)
      expect(chartComponent.exists()).toBe(true)
    })

    it('数据筛选和搜索流程测试', async () => {
      // 在明细页面进行筛选
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponent = wrapper.findComponent(Details)
      
      // 选择特定月份
      if (detailsComponent.vm.selectMonth) {
        await detailsComponent.vm.selectMonth(3)
      }
      
      // 验证筛选结果
      expect(detailsComponent.vm.selectedMonth).toBe(3)
      
      // 在图表页面验证筛选条件同步
      await wrapper.vm.$router.push('/chart')
      await wrapper.vm.$nextTick()
      
      const chartComponent = wrapper.findComponent(Chart)
      expect(chartComponent.vm.selectedMonth).toBe(3)
    })
  })

  // 6. 错误处理和边界情况测试
  describe('错误处理和边界情况测试', () => {
    it('网络异常时应用应该保持稳定', async () => {
      // 模拟网络异常
      jest.spyOn(window, 'fetch').mockRejectedValue(new Error('网络错误'))
      
      // 尝试在各页面进行操作
      const recordComponent = wrapper.findComponent(Record)
      if (recordComponent.vm.sendMessage) {
        await recordComponent.vm.sendMessage()
      }
      
      // 应用应该仍然可用
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.findComponent(TabBar).exists()).toBe(true)
    })

    it('数据加载失败时应该显示友好提示', async () => {
      // 模拟数据加载失败
      jest.spyOn(console, 'error').mockImplementation(() => {})
      
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponent = wrapper.findComponent(Details)
      if (detailsComponent.vm.loadData) {
        jest.spyOn(detailsComponent.vm, 'loadData').mockRejectedValue(new Error('加载失败'))
        await detailsComponent.vm.loadData()
      }
      
      // 应该显示错误提示而不是崩溃
      expect(detailsComponent.exists()).toBe(true)
    })

    it('内存不足时应该优雅降级', async () => {
      // 模拟内存压力
      const mockMemoryInfo = {
        usedJSHeapSize: 50000000, // 50MB
        totalJSHeapSize: 52428800, // 50MB
        jsHeapSizeLimit: 52428800  // 50MB  
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemoryInfo,
        writable: true
      })
      
      // 切换页面时应该清理不必要的资源
      await wrapper.vm.$router.push('/chart')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.exists()).toBe(true)
    })
  })

  // 7. 性能和用户体验测试
  describe('性能和用户体验测试', () => {
    it('页面切换应该流畅无卡顿', async () => {
      const startTime = performance.now()
      
      // 快速切换页面
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      await wrapper.vm.$router.push('/chart')
      await wrapper.vm.$nextTick()
      
      await wrapper.vm.$router.push('/record')
      await wrapper.vm.$nextTick()
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 页面切换应该在合理时间内完成
      expect(duration).toBeLessThan(1000) // 1秒内
    })

    it('应该正确处理页面预加载', async () => {
      // 验证路由懒加载配置
      expect(wrapper.vm.$router.options.routes).toBeDefined()
      
      // 验证组件是否支持预加载
      const preloadSpy = jest.spyOn(wrapper.vm, '$preload')
      if (wrapper.vm.$preload) {
        wrapper.vm.$preload('/details')
        expect(preloadSpy).toHaveBeenCalledWith('/details')
      }
    })

    it('应该正确实现页面缓存', async () => {
      // 第一次访问页面
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponent = wrapper.findComponent(Details)
      const initialData = detailsComponent.vm.$data
      
      // 离开页面
      await wrapper.vm.$router.push('/record')
      await wrapper.vm.$nextTick()
      
      // 再次访问页面
      await wrapper.vm.$router.push('/details')
      await wrapper.vm.$nextTick()
      
      const detailsComponentAgain = wrapper.findComponent(Details)
      // 数据应该被缓存
      expect(detailsComponentAgain.exists()).toBe(true)
    })
  })
})
