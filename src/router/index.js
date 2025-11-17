import { createRouter, createWebHistory } from 'vue-router'

// 懒加载路由组件
import Home from '../views/Home.vue'
const PhotoDetail = () => import('../views/PhotoDetail.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: '摄影作品集'
    }
  },
  {
    path: '/photo/:id',
    name: 'PhotoDetail',
    component: PhotoDetail,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? to.meta.title : '摄影网站';
  next();
})

export default router