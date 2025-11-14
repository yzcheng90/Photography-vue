import { createRouter, createWebHistory } from 'vue-router'

// 懒加载路由组件
const Home = () => import('../views/Home.vue')
const PhotoDetail = () => import('../views/PhotoDetail.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
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

export default router