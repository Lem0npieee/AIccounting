import { createRouter, createWebHashHistory } from 'vue-router'
import Details from '../views/Details.vue'
import Chart from '../views/Chart.vue'
import Record from '../views/Record.vue'

const routes = [
  {
    path: '/',
    redirect: '/details'
  },
  {
    path: '/details',
    name: 'Details',
    component: Details
  },
  {
    path: '/chart',
    name: 'Chart',
    component: Chart
  },
  {
    path: '/record',
    name: 'Record',
    component: Record
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
