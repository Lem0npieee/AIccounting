import Vue from 'vue'
import Router from 'vue-router'
import App from '@/App'
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

describe('App.vue', () => {
  let wrapper

  beforeEach(() => {
    const Constructor = Vue.extend(App)
    wrapper = new Constructor({
      router
    }).$mount()
  })

  it('应该正确渲染App组件', () => {
    expect(wrapper.$el.id).toBe('app')
    expect(wrapper.$el.classList.contains('app')).toBeFalsy()
  })

  it('应该包含router-view', () => {
    const routerView = wrapper.$el.querySelector('router-view')
    expect(routerView).toBeTruthy()
  })

  it('应该包含底部导航栏', () => {
    const navBottom = wrapper.$el.querySelector('.nav-bottom')
    expect(navBottom).toBeTruthy()
  })

  it('应该正确引入TabBar组件', () => {
    expect(wrapper.$options.components.TabBar).toBeDefined()
    expect(wrapper.$options.components.TabBar.name).toBe('TabBar')
  })

  it('应该设置正确的样式', () => {
    const app = wrapper.$el
    const styles = window.getComputedStyle(app)
    
    // 检查基本样式设置
    expect(app.style.height).toBeTruthy()
    expect(app.style.display).toBeTruthy()
  })

  it('底部导航应该有正确的样式类', () => {
    const navBottom = wrapper.$el.querySelector('.nav-bottom')
    expect(navBottom.classList.contains('nav-bottom')).toBe(true)
  })
})
