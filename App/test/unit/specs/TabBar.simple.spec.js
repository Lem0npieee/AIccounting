import Vue from 'vue'
import Router from 'vue-router'
import TabBar from '@/components/common/TabBar'

Vue.use(Router)

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

  beforeEach(() => {
    const Constructor = Vue.extend(TabBar)
    wrapper = new Constructor({
      router
    }).$mount()
  })

  it('应该正确渲染组件', () => {
    expect(wrapper.$el.classList.contains('tab-bar')).toBe(true)
  })

  it('应该渲染所有导航标签', () => {
    const tabItems = wrapper.$el.querySelectorAll('.tab-item')
    expect(tabItems.length).toBe(3)
  })

  it('应该正确显示标签图标', () => {
    const icons = wrapper.$el.querySelectorAll('.icon')
    expect(icons.length).toBe(3)
  })

  it('应该包含正确的标签数据', () => {
    const tabs = wrapper.$data.tabs
    expect(tabs.length).toBe(3)
    expect(tabs[0].title).toBe('明细')
    expect(tabs[0].path).toBe('/details')
    expect(tabs[1].title).toBe('记账')
    expect(tabs[1].path).toBe('/record')
    expect(tabs[2].title).toBe('图表')
    expect(tabs[2].path).toBe('/chart')
  })

  it('应该正确显示标签标题', () => {
    const titles = wrapper.$el.querySelectorAll('.tab-title')
    expect(titles.length).toBe(3)
    expect(titles[0].textContent).toBe('明细')
    expect(titles[1].textContent).toBe('记账')
    expect(titles[2].textContent).toBe('图表')
  })
})
