import Vue from 'vue'
import Router from 'vue-router'
import Details from '@/views/Details'
import Chart from '@/views/Chart'
import Record from '@/views/Record'

Vue.use(Router)

export default new Router({
  routes: [
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
})
