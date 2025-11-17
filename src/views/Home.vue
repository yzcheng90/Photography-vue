<template>
  <div class="home">
    <!-- 个人信息区域 - 扁平简约设计 -->
  <div class="profile-section flat-design" v-if="photos.length > 0" style="background-image: url('https://picsum.photos/id/64/200');">
    <div class="profile-container">
      <div class="profile-header">
        <div class="profile-avatar-container">
          <img src="https://picsum.photos/id/64/200" alt="摄影师头像" class="profile-avatar">
        </div>
        <div class="profile-details">
          <h1 class="profile-name">摄影师小明</h1>
          <p class="profile-bio">热爱记录生活中的美好瞬间，专注于风景和人像摄影。欢迎关注我的社交媒体账号！</p>
        </div>
        <div class="profile-stats">
          <div class="stats-item">
            <span class="stats-count">{{ photos.length }}</span>
            <span class="stats-label">作品</span>
          </div>
          <div class="stats-item">
            <span class="stats-count">{{ 5 }}</span>
            <span class="stats-label">分类</span>
          </div>
          <div class="stats-item">
            <span class="stats-count">{{ 120 }}</span>
            <span class="stats-label">收藏</span>
          </div>
        </div>
      </div>
    </div>
  </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在加载精彩照片...</p>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="photos.length === 0" class="empty-state fade-enter-active">
      <div class="empty-icon">📷</div>
      <h3 class="empty-title">暂无照片数据</h3>
      <p class="empty-description">请稍后再试，或刷新页面</p>
      <button class="btn btn-primary" @click="refreshPhotos">刷新页面</button>
    </div>
    
    <!-- 照片网格区域 - Instagram风格 -->
    <div v-else class="photos-container fade-enter-active">
      <WaterfallGallery 
        :items="photos" 
        @item-click="handlePhotoClick"
        :column-count="3"
        :gap="2"
        class="photo-gallery"
      />
    </div>
  
    
    <!-- 返回顶部按钮 -->
    <button 
      v-if="showBackToTop" 
      class="back-to-top"
      @click="backToTop"
      title="返回顶部"
    >
      ↑
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePhotoStore } from '../store/photoStore'
import WaterfallGallery from '../components/WaterfallGallery.vue'

const router = useRouter()
const photoStore = usePhotoStore()

// 计算属性
const photos = computed(() => photoStore.photos)
const loading = computed(() => photoStore.loading)
const hasMore = computed(() => photoStore.hasMore)

// 响应式状态
const showBackToTop = ref(false)
const scrollPosition = ref(0)

const loadMore = () => {
  if (!loading.value && hasMore.value) {
    photoStore.loadPhotos()
  }
}

const refreshPhotos = () => {
  // 重置store数据
  photoStore.clearPhotos()
  loadMore()
}

const handlePhotoClick = (photo) => {
  // 设置当前照片
  photoStore.setCurrentPhoto(photo)
  // 跳转到详情页
  router.push({ name: 'PhotoDetail', params: { id: photo.id } })
}

// 处理滚动事件
const handleScroll = () => {
  scrollPosition.value = window.scrollY
  showBackToTop.value = scrollPosition.value > 500
  
  // 实现滚动到底部自动加载更多
  if (scrollPosition.value + window.innerHeight > document.body.offsetHeight - 300) {
    if (!loading.value && hasMore.value) {
      // 防止重复触发
      setTimeout(() => {
        if (!loading.value && hasMore.value) {
          loadMore()
        }
      }, 500)
    }
  }
}

// 返回顶部
const backToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  // 如果没有照片数据，加载初始数据
  if (photos.value.length === 0) {
    photoStore.loadPhotos()
  }
  // 添加滚动监听
  window.addEventListener('scroll', handleScroll)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* 全局样式重置和变量 */
:root {
  --primary-color: #00bcd4;
  --secondary-color: #6c757d;
  --bg-primary: #606060;
  --bg-secondary: #505050;
  --bg-tertiary: #707070;
  --text-primary: #ffffff;
  --text-secondary: #d0d0d0;
  --border-color: #808080;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.6);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.7);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.8);
  --transition: all 0.3s ease;
  --border-radius: 8px;
}

/* 全局文本颜色确保为白色 */
.home * {
  color: white !important;
}

/* Instagram风格的布局 */
.home {
  padding: 0;
  width: 100%;
  margin: 0;
  position: relative;
  min-height: 100vh;
  background-color: var(--bg-primary);
  overflow-x: hidden;
}

/* 个人信息区域 - 带高斯模糊背景 */
  .profile-section {
    position: relative;
    padding: 30px 20px;
    border-bottom: 1px solid var(--border-color);
    z-index: 10;
    overflow: hidden;
  }

  /* 扁平简约的个人信息板块设计 - 磨砂玻璃效果 */
.flat-design {
  background-size: cover;
  background-position: center;
  position: relative;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.flat-design::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  filter: blur(20px);
  transform: scale(1.1);
  z-index: 1;
}

.flat-design > * {
  position: relative;
  z-index: 2;
}

.flat-design {
  background-color: rgba(52, 53, 53, 0.7);
  background-blend-mode: overlay;
  backdrop-filter: blur(10px); /* 磨砂玻璃效果 */
  -webkit-backdrop-filter: blur(10px); /* Safari 兼容性 */
}

.flat-design .profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.flat-design .profile-header {
  display: flex;
  align-items: center; /* 确保所有元素垂直居中 */
  gap: 16px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.flat-design .profile-avatar-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
}

.flat-design .profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%; /* 圆形头像 */
  object-fit: cover;
  border: 2px solid var(--primary-color);
}

.flat-design .profile-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

.flat-design .profile-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.flat-design .profile-bio {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal; /* 允许换行，而不是强制单行 */
  word-wrap: break-word; /* 长单词换行 */
}

/* 确保在所有屏幕尺寸下都显示个人介绍 */
@media (max-width: 768px) {
  .flat-design .profile-bio {
    display: block !important; /* 强制显示 */
    white-space: normal;
    max-width: 100%;
    margin-bottom: 8px;
  }
}

.flat-design .profile-stats {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
  align-items: center;
}

.flat-design .stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 50px;
}

.flat-design .stats-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.flat-design .stats-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 2px 0 0 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flat-design {
    padding: 12px 0;
  }
  
  .flat-design .profile-header {
    gap: 12px;
  }
  
  .flat-design .profile-avatar {
    width: 56px;
    height: 56px;
  }
  
  .flat-design .profile-name {
    font-size: 16px;
  }
  
  .flat-design .profile-bio {
    font-size: 13px;
  }
  
  .flat-design .profile-stats {
    gap: 12px;
  }
  
  .flat-design .stats-item {
    min-width: 40px;
  }
  
  .flat-design .stats-count {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .flat-design .profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .flat-design .profile-details {
    width: calc(100% - 64px);
  }
  
  .flat-design .profile-bio {
    display: none;
  }
  
  .flat-design .profile-stats {
    width: 100%;
    justify-content: space-around;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
  }
}
  
  /* 头像高斯模糊背景 */
  .profile-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(20px);
    -webkit-filter: blur(20px);
    transform: scale(1.1);
    z-index: -1;
    opacity: 0.5;
  }
  
  /* 背景叠加层，确保文字可读性 */
  .profile-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, var(--bg-primary) 0%, var(--bg-primary) 100%);
    opacity: 0.8;
    z-index: -1;
  }

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 头像和统计信息区域 */
.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 40px;
  margin-bottom: 30px;
}

.profile-avatar-container {
  position: relative;
}

.profile-avatar {
  width: 150px;
  height: 150px;
  border-radius: 75px;
  object-fit: cover;
  border: 2px solid var(--border-color);
}

/* 统计数据 */
.profile-stats {
  display: flex;
  gap: 40px;
  flex: 1;
  padding-top: 20px;
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stats-count {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary) !important;
}

.stats-label {
  font-size: 14px;
  color: var(--text-secondary) !important;
  margin-top: 4px;
}

/* 详细信息区域 */
.profile-details {
  margin-top: 10px;
}

.profile-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.profile-bio {
  font-size: 16px;
  color: var(--text-primary) !important;
  margin: 0 0 16px 0;
  line-height: 1.5;
  max-width: 800px;
}

/* 操作按钮 */
.profile-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white !important;
  border-color: var(--primary-color);
  min-width: 130px;
}

.btn-primary:hover {
  background-color: #00acc1;
  border-color: #00acc1;
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-primary) !important;
  border-color: var(--border-color);
  min-width: 100px;
}

.btn-secondary:hover {
  background-color: var(--bg-secondary);
}

/* 社交媒体链接 */
.profile-links {
  margin-bottom: 10px;
}

.social-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--primary-color) !important;
  font-size: 14px;
  transition: color 0.2s ease;
}

.social-link:hover {
  color: #00acc1 !important;
}

.social-icon {
  font-size: 16px;
}

/* 移除了导航栏，为简洁布局 */

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  gap: 20px;
  padding: 40px 20px;
  background-color: var(--bg-primary);
}

.loading-text {
  font-size: 16px;
  color: var(--text-secondary) !important;
  margin: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  padding: 40px 20px;
  background-color: var(--bg-primary);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.8;
}

.empty-title {
  font-size: 20px;
  color: var(--text-primary) !important;
  margin-bottom: 10px;
}

.empty-description {
  font-size: 14px;
  color: var(--text-secondary) !important;
  margin-bottom: 30px;
}

/* 照片容器 - Instagram风格 */
.photos-container {
  padding: 0;
  margin: 0;
  margin-top: 10px;
  width: 100%;
}

.photo-gallery {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 返回顶部按钮 - Instagram风格 */
.back-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 25px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white !important;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  z-index: 100;
}

.back-to-top:hover {
  background-color: rgba(0, 0, 0, 0.9);
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.diagnostic-link {
  display: inline-block;
  margin-top: 15px;
  padding: 10px 20px;
  background-color: #3498db;
  color: white !important;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.diagnostic-link:hover {
  background-color: #2980b9;
}

/* 过渡动画 */
.slide-up-enter-active {
  animation: slideUp 0.5s ease-out;
}

.fade-enter-active {
  animation: fadeIn 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 响应式设计 - Instagram风格适配 */
@media (max-width: 1024px) {
  .profile-container,
  .nav-container,
  .photo-gallery {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .profile-section {
    padding: 20px 16px;
  }
  
  .profile-header {
    gap: 20px;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .profile-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50px;
  }
  
  .profile-stats {
    padding-top: 10px;
    gap: 20px;
  }
  
  .stats-count {
    font-size: 20px;
  }
  
  .profile-name {
    font-size: 20px;
  }
  
  .profile-bio {
    font-size: 14px;
    max-width: 100%;
  }
  
  .nav-item {
    padding: 14px 16px;
    font-size: 13px;
  }
  
  .back-to-top {
    bottom: 20px;
    right: 20px;
    width: 45px;
    height: 45px;
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .profile-section {
    padding: 16px 12px;
  }
  
  .profile-header {
    gap: 16px;
  }
  
  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 40px;
  }
  
  .profile-stats {
    gap: 16px;
  }
  
  .stats-count {
    font-size: 18px;
  }
  
  .stats-label {
    font-size: 13px;
  }
  
  .profile-name {
    font-size: 18px;
  }
  
  .profile-bio {
    font-size: 13px;
    margin-bottom: 12px;
  }
  
  .profile-actions {
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .btn-primary {
    min-width: 100px;
  }
  
  .btn-secondary {
    min-width: 80px;
  }
  
  .social-link {
    font-size: 13px;
  }
  
  .nav-item {
    padding: 12px 10px;
    font-size: 12px;
  }
  
  .loading-container,
  .empty-state {
    padding: 30px 10px;
    min-height: 400px;
  }
  
  .empty-icon {
    font-size: 48px;
  }
  
  .empty-title {
    font-size: 18px;
  }
  
  .back-to-top {
    bottom: 15px;
    right: 15px;
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}
</style>