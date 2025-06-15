<template>
  <div class="tab-bar">
    <div 
      v-for="(item, index) in tabs" 
      :key="index" 
      class="tab-item"
      :class="{ active: $route.path === item.path }"
      @click="navigateTo(item.path)"
    >
      <div class="icon">
        <i :class="item.icon"></i>
      </div>
      <div class="tab-title">{{ item.title }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TabBar',
  data() {
    return {
      tabs: [
        {
          title: '明细',
          path: '/details',
          icon: 'icon-details'
        },
        {
          title: '记账',
          path: '/record',
          icon: 'icon-record'
        },
        {
          title: '图表',
          path: '/chart',
          icon: 'icon-chart'
        }
      ]
    }
  },
  methods: {
    navigateTo(path) {
      // 避免NavigationDuplicated错误
      if (this.$route.path !== path) {
        this.$router.push(path).catch(() => {})
      }
    }
  }
}
</script>

<style scoped>
.tab-bar {
  height: 50px;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.tab-item {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.icon {
  height: 24px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon i {
  font-size: 20px;
}

.icon-details:before {
  content: "📋";
}

.icon-record:before {
  content: "✏️";
}

.icon-chart:before {
  content: "📊";
}

.tab-title {
  font-size: 12px;
}

.active {
  color: #409EFF;
}
</style> 