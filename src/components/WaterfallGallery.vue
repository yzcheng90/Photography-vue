<template>
  <div class="waterfall-gallery">
    <div 
      v-for="(column, columnIndex) in columns" 
      :key="columnIndex" 
      class="waterfall-column"
    >
      <div 
        v-for="item in column" 
        :key="item.id" 
        class="gallery-item"
        @click="onItemClick(item)"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <div class="image-container">
          <!-- 骨架屏加载效果 -->
          <div v-if="!loadedItems[item.id]" class="skeleton-loader">
            <div class="skeleton-shimmer"></div>
          </div>
          <img 
            :src="item.thumbnail" 
            :alt="item.title" 
            loading="lazy"
            @load="handleImageLoad($event, item)"
            @error="handleImageError(item)"
            :class="{ 'loaded': loadedItems[item.id] }"
          />
          <!-- 图片加载错误占位符 -->
          <div v-if="errorItems[item.id]" class="image-error"
               @click.stop
          >
            <span class="error-icon">⚠️</span>
            <button class="retry-button" @click="retryLoadImage(item)">重试</button>
          </div>
        </div>
        <div class="item-info"
               v-if="showInfoOnHover"
          >
            <h3 class="item-title">{{ item.title }}</h3>
            <p class="item-date">{{ formatDate(item.date) }}</p>
            <div v-if="item.exif" class="item-exif-preview">
              <div class="exif-preview-row">
                <span class="exif-preview-item">{{ item.exif?.camera || '-' }}</span>
              </div>
              <div class="exif-preview-row">
                <span class="exif-preview-item">{{ item.exif?.aperture || '-' }}</span>
                <span class="exif-preview-item">{{ item.exif?.shutter || '-' }}</span>
                <span class="exif-preview-item">ISO {{ item.exif?.iso || '-' }}</span>
                <span class="exif-preview-item">{{ item.exif?.focalLength || '-' }}</span>
              </div>
            </div>
          </div>
      </div>
    </div>
    <!-- 空状态提示 -->
    <div v-if="props.items.length === 0" class="empty-gallery">
      <div class="empty-icon">📸</div>
      <p class="empty-text">暂无照片内容</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  columnCount: {
    type: Number,
    default: 3
  },
  gap: {
    type: Number,
    default: 40
  },
  showInfoOnHover: {
    type: Boolean,
    default: true
  },
  animationDuration: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['item-click'])

// 响应式状态
const responsiveColumnCount = ref(props.columnCount)
const loadedItems = ref({})
const errorItems = ref({})
const touchTimer = ref(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isTouchMove = ref(false)

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

// 根据屏幕宽度计算响应式列数
const calculateColumnCount = () => {
  const width = window.innerWidth
  if (width <= 480) {
    responsiveColumnCount.value = 1
  } else if (width <= 768) {
    responsiveColumnCount.value = 2
  } else if (width <= 1024) {
    responsiveColumnCount.value = 3
  } else if (width <= 1600) {
    responsiveColumnCount.value = 5 // 修改为5列
  } else {
    responsiveColumnCount.value = 5
  }
}

// 使用响应式状态存储列布局
const columns = ref([])

// 重写瀑布流布局分配函数，确保正确的照片分配
const updateColumns = () => {
  // 创建指定数量的列数组
  const colCount = responsiveColumnCount.value
  const cols = Array(colCount).fill(null).map(() => [])
  
  if (props.items.length === 0) {
    columns.value = cols
    return
  }
  
  // 简单直接的模运算分配，确保每张照片都分配到不同列
  props.items.forEach((item, index) => {
    // 关键修复：确保columnIndex计算正确且在有效范围内
    const columnIndex = index % colCount
    // 为每个项目添加固定高度属性
    const itemWithHeight = {
      ...item,
      height: 300
    }
    // 将项目添加到对应列
    cols[columnIndex].push(itemWithHeight)
  })
  
  // 直接赋值，确保反应式更新
  columns.value = [...cols]
}

// 监听items变化，确保布局始终更新
watch(() => props.items, () => {
  // 使用setTimeout确保在下一个tick更新，避免渲染问题
  setTimeout(() => {
    updateColumns()
  }, 0)
}, { deep: true, immediate: true })

// 监听列数变化，重新分配布局
watch(responsiveColumnCount, () => {
  setTimeout(() => {
    updateColumns()
  }, 0)
})
// 处理图片加载完成
const handleImageLoad = (event, item) => {
  const img = event.target
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    const aspectRatio = img.naturalHeight / img.naturalWidth
    loadedItems.value[item.id] = {
      width: img.naturalWidth,
      height: img.naturalHeight,
      aspectRatio
    }
    // 清除错误状态
    delete errorItems.value[item.id]
  }
}

// 处理图片加载错误
const handleImageError = (item) => {
  errorItems.value[item.id] = true
}

// 重试加载图片
const retryLoadImage = (item) => {
  delete errorItems.value[item.id]
  delete loadedItems.value[item.id]
  
  // 触发重新渲染
  const img = new Image()
  img.src = item.thumbnail
  img.onload = (e) => {
    handleImageLoad({ target: img }, item)
  }
}

// 处理触摸开始
const handleTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX
  touchStartY.value = event.touches[0].clientY
  isTouchMove.value = false
  
  // 长按检测
  touchTimer.value = setTimeout(() => {
    // 可以在这里实现长按功能
  }, 500)
}

// 处理触摸移动
const handleTouchMove = (event) => {
  const deltaX = Math.abs(event.touches[0].clientX - touchStartX.value)
  const deltaY = Math.abs(event.touches[0].clientY - touchStartY.value)
  
  // 如果移动超过10px，则认为是滚动，不是点击
  if (deltaX > 10 || deltaY > 10) {
    isTouchMove.value = true
    if (touchTimer.value) {
      clearTimeout(touchTimer.value)
    }
  }
}

// 处理触摸结束
const handleTouchEnd = () => {
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
  }
}

// 处理项目点击
const onItemClick = (item) => {
  // 避免在触摸移动时触发点击
  if (isTouchMove.value) {
    isTouchMove.value = false
    return
  }
  
  // 防止快速重复点击
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
  }
  
  emit('item-click', item)
}

// 监听屏幕大小变化
// 已整合到上面的onMounted中

onUnmounted(() => {
  window.removeEventListener('resize', calculateColumnCount)
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
  }
})

// 预加载和清理图片资源的函数
const preloadImages = () => {
  // 清除不在当前列表中的项目
  const currentIds = new Set(props.items.map(item => item.id))
  Object.keys(loadedItems.value).forEach(id => {
    if (!currentIds.has(id)) {
      delete loadedItems.value[id]
      delete errorItems.value[id]
    }
  })
  
  // 预加载新图片
  props.items.forEach(item => {
    if (!loadedItems.value[item.id] && !errorItems.value[item.id]) {
      const img = new Image()
      img.src = item.thumbnail
      img.onload = (e) => {
        handleImageLoad({ target: img }, item)
      }
      img.onerror = () => {
        handleImageError(item)
      }
    }
  })
}

// 在组件挂载时初始化
onMounted(() => {
  calculateColumnCount()
  window.addEventListener('resize', calculateColumnCount)
  preloadImages()
  // 确保在挂载时执行一次布局更新
  updateColumns()
})
</script>

<style scoped>
/* 全局深色主题变量 */
:root {
  --primary-color: #00bcd4;
  --secondary-color: #6c757d;
  --bg-primary: #343535;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #121212;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --border-color: #202020;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.8);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.9);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 1);
  --transition: all 0.3s ease;
  --border-radius: 8px;
}

/* 确保文本颜色为白色 */
.waterfall-gallery * {
  color: white !important;
}

.waterfall-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px; /* 增加间距至16px */
    width: 100%;
    transition: all 0.3s ease;
    animation: fadeIn 0.6s ease-out;
    padding: 0 8px;
  }

  .waterfall-column {
    display: flex;
    flex-direction: column;
    gap: 16px; /* 增加间距至16px */
  }

.gallery-item {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    transition: all v-bind('animationDuration + "ms"') ease;
    background-color: var(--bg-secondary);
    box-shadow: var(--shadow-sm);
    transform-origin: center;
    border: 1px solid var(--border-color);
    height: 300px; /* 固定高度 */
    width: 100%;
    transform: scale(1);
  /* 确保圆角平滑 */
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

/* 桌面端悬停效果 - 优化以避免覆盖邻近图片 */
@media (hover: hover) {
    .gallery-item {
      transition: box-shadow 0.3s ease, z-index 0s 0.3s, transform 0.3s ease;
      z-index: 1;
    }
    
    .gallery-item:hover {
      box-shadow: var(--shadow-md);
      z-index: 10;
      transform: scale(1.02);
    }
  
  .gallery-item:hover .image-container img {
    transform: scale(1.1);
  }
  
  .gallery-item:active {
    /* 点击效果保持，但不改变布局大小 */
  }
}

/* 移动端触摸效果 */
@media (hover: none) {
  .gallery-item {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  
  .gallery-item:active {
    transform: scale(0.98);
  }
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-tertiary);
}

/* 图片样式 - 支持容器内放大效果 */
.image-container img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease, opacity 0.3s ease;
  opacity: 0;
  will-change: transform;
}

.image-container img.loaded {
  opacity: 1;
}

.gallery-item:hover .image-container img {
  transform: scale(1.05);
}

/* 骨架屏加载效果 */
.skeleton-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bg-tertiary);
  border-radius: inherit;
  overflow: hidden;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 图片加载错误处理 */
.image-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.6;
  color: var(--primary-color) !important;
}

.retry-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
}

.retry-button:hover {
  background-color: #00acc1;
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* 图片信息覆盖层 */
.item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(0, 0, 0, 0.7) 70%,
    rgba(0, 0, 0, 0.9)
  );
  color: white;
  padding: 20px 16px 16px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity v-bind('animationDuration + "ms"') ease,
              transform v-bind('animationDuration + "ms"') ease;
  pointer-events: none;
  /* 移除顶部边框，解决黑线问题 */
}

.gallery-item:hover .item-info {
  opacity: 1;
  transform: translateY(0);
}

.item-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.item-date {
  margin: 0 0 8px 0;
  font-size: 13px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

/* EXIF信息预览样式 */
.item-exif-preview {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.85;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.exif-preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}

.exif-preview-row:last-child {
  margin-bottom: 0;
}

.exif-preview-item {
  white-space: nowrap;
  color: var(--text-primary) !important;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .exif-preview-row {
    gap: 8px;
  }
  
  .item-exif-preview {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .exif-preview-row {
    gap: 6px;
  }
  
  .exif-preview-item {
    font-size: 10px;
  }
}

/* 空状态样式 */
.empty-gallery {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px 20px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
  color: var(--text-secondary) !important;
  margin: 0;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 1600px) {
  .waterfall-gallery {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1024px) {
  .waterfall-gallery {
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  
  .waterfall-column {
    gap: 18px;
  }
  
  .gallery-item {
    border-radius: 10px;
  }
}

@media (max-width: 768px) {
  .waterfall-gallery {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
  
  .waterfall-column {
    gap: 15px;
  }
  
  .item-info {
    padding: 16px 12px 12px;
  }
  
  .item-title {
    font-size: 14px;
  }
  
  .item-date {
    font-size: 12px;
  }
  
  .gallery-item:hover .image-container img {
    transform: scale(1.03);
  }
}

@media (max-width: 480px) {
  .waterfall-gallery {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .waterfall-column {
    gap: 12px;
  }
  
  .gallery-item {
    border-radius: 8px;
  }
  
  .item-info {
    padding: 14px 10px 10px;
  }
  
  .item-title {
    font-size: 14px;
  }
  
  .item-date {
    font-size: 12px;
  }
  
  .empty-gallery {
    min-height: 200px;
    padding: 30px 15px;
  }
  
  .empty-icon {
    font-size: 48px;
  }
  
  .empty-text {
    font-size: 14px;
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-device-pixel-ratio: 2), (resolution: 192dpi) {
  .image-container img {
    image-rendering: -webkit-optimize-contrast;
  }
}
</style>