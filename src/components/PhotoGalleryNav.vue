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
  // 点击后滚动到该照片（通过watch会自动触发scrollToCurrentPhoto）
}

// Refs
const galleryContainer = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const scrollPosition = ref(0)
const touchStartX = ref(0)
const touchStartTime = ref(0)
const touchStarted = ref(false)

// 计算属性
const currentPhotoIndex = computed(() => {
  // 确保正确处理数字类型的ID比较
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
    behavior: 'smooth'
  })
}

// 向右滚动
const scrollRight = () => {
  if (!galleryContainer.value) return
  
  const { clientWidth } = galleryContainer.value
  galleryContainer.value.scrollBy({
    left: clientWidth * 0.8,
    behavior: 'smooth'
  })
}

// 自动滚动到当前照片
const scrollToCurrentPhoto = async () => {
  await nextTick()
  
  if (!galleryContainer.value || currentPhotoIndex.value === -1) return
  
  // 使用更可靠的选择器，通过ID属性查找
  const thumbnail = galleryContainer.value.querySelector(`[data-photo-id="${props.currentPhotoId}"]`)
  if (!thumbnail) {
    // 回退到nth-child选择器
    const fallbackThumbnail = galleryContainer.value.querySelector(`.thumbnail-item:nth-child(${currentPhotoIndex.value + 1})`)
    if (fallbackThumbnail) {
      const { left, width } = fallbackThumbnail.getBoundingClientRect()
      const containerLeft = galleryContainer.value.getBoundingClientRect().left
      const containerWidth = galleryContainer.value.clientWidth
      
      // 计算目标滚动位置，使当前照片居中
      const targetScroll = galleryContainer.value.scrollLeft + (left - containerLeft) - (containerWidth - width) / 2
      
      galleryContainer.value.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      })
    }
    return
  }
  
  const { left, width } = thumbnail.getBoundingClientRect()
  const containerLeft = galleryContainer.value.getBoundingClientRect().left
  const containerWidth = galleryContainer.value.clientWidth
  
  // 计算目标滚动位置，使当前照片居中
  const targetScroll = galleryContainer.value.scrollLeft + (left - containerLeft) - (containerWidth - width) / 2
  
  galleryContainer.value.scrollTo({
    left: targetScroll,
    behavior: 'smooth'
  })
}

// 监听当前照片变化
watch(() => props.currentPhotoId, () => {
  scrollToCurrentPhoto()
})

// 监听照片列表变化
watch(() => props.photos, () => {
  scrollToCurrentPhoto()
}, { deep: true })

// 组件挂载
onMounted(() => {
  handleScroll()
  scrollToCurrentPhoto()
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleScroll)
})

// 组件卸载前清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleScroll)
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
  scroll-behavior: smooth;
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
  height: 100px; /* 设置固定高度，不再依赖内容高度 */
  margin: 10px 0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid var(--border-color); /* 使用主题变量 */
  background-color: var(--bg-secondary); /* 使用主题变量 */
}

/* 加载动画 - 仅在图片未加载时显示 */
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
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  border-color: var(--primary-color);
}

.thumbnail-item.active {
  border-color: var(--primary-color); /* 使用主题变量 */
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3); /* 调整阴影以配合更细的边框 */
  transform: translateY(-4px);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  display: block; /* 确保图片占满容器 */
}

.thumbnail-item:hover img {
  transform: scale(1.05);
}

.photo-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px; /* 减少内边距，避免占用过多空间 */
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
  color: var(--text-primary); /* 使用主题变量 */
  font-size: 10px; /* 减小字体大小 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: translateY(100%);
  transition: transform 0.3s ease, opacity 0.3s ease;
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