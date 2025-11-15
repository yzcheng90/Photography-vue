<template>
  <div class="photo-gallery-nav">
    <div 
      ref="galleryContainer"
      class="gallery-container"
      @wheel="handleWheel"
      @scroll="handleScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="thumbnails">
        <div 
          v-for="photo in photos" 
          :key="photo.id" 
          class="thumbnail-item"
          :data-photo-id="photo.id"
          :class="{ 
            active: Number(photo.id) === Number(currentPhotoId),
            loaded: loadedPhotos[photo.id]
          }"
          @click="onPhotoClick(photo.id)"
        >
          <img 
            :src="photo.thumbnail" 
            :alt="photo.title" 
            :loading="'lazy'"
            @load="loadedPhotos[photo.id] = true"
          />
          <div class="photo-title">{{ photo.title }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

// 存储每张图片的加载状态
const loadedPhotos = ref({})

// Props
const props = defineProps({
  photos: {
    type: Array,
    required: true,
    default: () => []
  },
  currentPhotoId: {
    type: Number,
    default: null
  },
  showTitles: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['photo-click'])

// 处理照片点击
const onPhotoClick = (photoId) => {
  emit('photo-click', photoId)
}

// Refs
const galleryContainer = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const scrollPosition = ref(0)
const touchStartX = ref(0)
const touchStartTime = ref(0)
const touchStarted = ref(false)

// 缓存DOM元素
const cachedThumbnails = ref(new Map())

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 计算属性
const currentPhotoIndex = computed(() => {
  return props.photos.findIndex(photo => Number(photo.id) === Number(props.currentPhotoId))
})

// 处理滚动事件
const handleScroll = () => {
  if (!galleryContainer.value) return
  
  const { scrollLeft, scrollWidth, clientWidth } = galleryContainer.value
  scrollPosition.value = scrollLeft
  
  // 更新滚动按钮状态
  canScrollLeft.value = scrollLeft > 10
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 10
}

// 处理滚轮事件
const handleWheel = (event) => {
  event.preventDefault()
  if (!galleryContainer.value) return
  
  galleryContainer.value.scrollLeft += event.deltaY
}

// 触摸事件处理
const handleTouchStart = (event) => {
  touchStarted.value = true
  touchStartX.value = event.touches[0].clientX
  touchStartTime.value = Date.now()
}

const handleTouchMove = (event) => {
  if (!touchStarted.value) return
  event.preventDefault()
}

const handleTouchEnd = (event) => {
  if (!touchStarted.value) return
  
  const touchEndX = event.changedTouches[0].clientX
  const touchDuration = Date.now() - touchStartTime.value
  const diffX = touchStartX.value - touchEndX
  
  // 快速滑动检测
  if (Math.abs(diffX) > 50 && touchDuration < 300) {
    if (diffX > 0) {
      // 向左滑动
      scrollRight()
    } else {
      // 向右滑动
      scrollLeft()
    }
  }
  
  touchStarted.value = false
}

// 向左滚动
const scrollLeft = () => {
  if (!galleryContainer.value) return
  
  const { clientWidth } = galleryContainer.value
  galleryContainer.value.scrollBy({
    left: -clientWidth * 0.8,
    behavior: 'auto' // 改为即时滚动
  })
}

// 向右滚动
const scrollRight = () => {
  if (!galleryContainer.value) return
  
  const { clientWidth } = galleryContainer.value
  galleryContainer.value.scrollBy({
    left: clientWidth * 0.8,
    behavior: 'auto' // 改为即时滚动
  })
}

// 优化后的滚动到当前照片函数
const scrollToCurrentPhoto = async () => {
  if (!galleryContainer.value || currentPhotoIndex.value === -1) return
  
  // 尝试从缓存获取DOM元素
  let thumbnail = cachedThumbnails.value.get(props.currentPhotoId)
  
  if (!thumbnail) {
    // 缓存未命中，查询DOM并缓存
    thumbnail = galleryContainer.value.querySelector(`[data-photo-id="${props.currentPhotoId}"]`)
    if (thumbnail) {
      cachedThumbnails.value.set(props.currentPhotoId, thumbnail)
    }
  }
  
  if (!thumbnail) {
    // 回退方案，但不使用smooth滚动
    const fallbackThumbnail = galleryContainer.value.querySelector(`.thumbnail-item:nth-child(${currentPhotoIndex.value + 1})`)
    if (fallbackThumbnail) {
      const { left, width } = fallbackThumbnail.getBoundingClientRect()
      const containerLeft = galleryContainer.value.getBoundingClientRect().left
      const containerWidth = galleryContainer.value.clientWidth
      
      // 计算目标滚动位置
      const targetScroll = galleryContainer.value.scrollLeft + (left - containerLeft) - (containerWidth - width) / 2
      
      // 直接设置滚动位置，避免动画
      galleryContainer.value.scrollLeft = targetScroll
    }
    return
  }
  
  // 优化版本：计算是否需要滚动（只有当当前照片不在可视区域中心时才滚动）
  const { left, right, width } = thumbnail.getBoundingClientRect()
  const containerLeft = galleryContainer.value.getBoundingClientRect().left
  const containerRight = galleryContainer.value.getBoundingClientRect().right
  const containerCenter = containerLeft + (containerRight - containerLeft) / 2
  const thumbnailCenter = left + width / 2
  
  // 如果缩略图已经在可视区域中心附近，不需要滚动
  if (Math.abs(thumbnailCenter - containerCenter) < width * 0.5) {
    return
  }
  
  // 计算目标滚动位置
  const targetScroll = galleryContainer.value.scrollLeft + (left - containerLeft) - (containerRight - containerLeft - width) / 2
  
  // 直接设置滚动位置，避免动画
  galleryContainer.value.scrollLeft = targetScroll
}

// 使用节流函数包装滚动函数
const throttledScrollToCurrentPhoto = throttle(scrollToCurrentPhoto, 100)

// 监听当前照片变化 - 移除深度监听
watch(() => props.currentPhotoId, () => {
  throttledScrollToCurrentPhoto()
})

// 监听照片列表变化 - 不使用深度监听
watch(() => props.photos.length, () => {
  // 清空缓存，因为列表可能已更改
  cachedThumbnails.value.clear()
  nextTick(() => {
    throttledScrollToCurrentPhoto()
  })
})

// 组件挂载
onMounted(() => {
  handleScroll()
  // 初始加载时不使用节流
  nextTick(() => {
    scrollToCurrentPhoto()
  })
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', throttledScrollToCurrentPhoto)
})

// 组件卸载前清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', throttledScrollToCurrentPhoto)
  cachedThumbnails.value.clear()
})
</script>

<style scoped>
.photo-gallery-nav {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 0;
  position: relative;
  margin: 0;
  border-bottom: 1px solid var(--border-color);
}

.gallery-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  /* 移除平滑滚动，使用JavaScript控制 */
  scroll-behavior: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  touch-action: pan-x;
  padding: 0;
}

/* 隐藏WebKit浏览器的滚动条 */
.gallery-container::-webkit-scrollbar {
  display: none;
}

.thumbnails {
  display: flex;
  gap: 15px;
  padding: 0;
  height: 100%;
  margin: 0;
}

.thumbnail-item {
  flex: 0 0 auto;
  width: 100px;
  height: 100px;
  margin: 10px 0;
  position: relative;
  cursor: pointer;
  /* 减少过渡效果，提高性能 */
  transition: border-color 0.2s ease;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid var(--border-color);
  background-color: var(--bg-secondary);
}

/* 简化加载动画，减少性能开销 */
.thumbnail-item:not(.loaded)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: shimmer 1.5s infinite;
  z-index: 1;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.thumbnail-item:hover {
  /* 移除translateY效果，仅保留边框和阴影变化 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  border-color: var(--primary-color);
}

.thumbnail-item.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
  /* 移除active状态的translateY效果 */
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 移除过渡效果以提高性能 */
  display: block;
}

/* 移除图片hover时的缩放效果，减少性能开销 */

.photo-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
  color: var(--text-primary);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: translateY(100%);
  /* 减少过渡时间 */
  transition: transform 0.2s ease, opacity 0.2s ease;
  opacity: 0;
}

.thumbnail-item:hover .photo-title {
  opacity: 1;
  transform: translateY(0);
}

.thumbnail-item.active .photo-title {
  opacity: 1;
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .photo-gallery-nav {
    height: 120px;
  }
  
  .thumbnail-item {
    width: 80px;
    border-width: 1.5px;
  }
  
  .photo-title {
    display: none;
  }
}

@media (max-width: 480px) {
  .photo-gallery-nav {
    height: 100px;
  }
  
  .thumbnail-item {
    width: 70px;
    border-width: 1.5px;
  }
  
  .thumbnails {
    gap: 10px;
    padding: 0 5px;
  }
}
</style>