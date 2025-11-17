<template>
  <div class="photo-detail-container">
    <!-- 背景图容器 - 放在最底层 -->
    <div class="background-container" :style="backgroundStyle"></div>
    
    <!-- 照片详情内容区域 - 在背景之上 -->
      <div class="photo-detail">
        <!-- 主要内容区域 -->
      <div v-if="currentPhoto.id" class="detail-content">
        <!-- 左右布局主容器 -->
        <div class="main-layout">
          <!-- 左侧照片展示区域 -->
          <div class="photo-display-area">
            
            <!-- 关闭按钮将通过image-container内的按钮实现 -->
            <div 
              class="image-container" 
              :class="{ 'image-loaded': imageLoaded, 'draggable': imageTransform.scale > 1 }"
              @wheel="handleWheel"
              @dblclick="handleDoubleClick"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @mouseleave="handleMouseUp"
            >
              <!-- 加载占位图 -->
              <div v-if="!imageLoaded" class="image-placeholder">
                <div class="loading-spinner"></div>
                <span class="loading-text">正在加载高质量图片...</span>
              </div>
              <!-- 缩略图预览 - 先显示，快速加载 -->
              <img 
                v-if="currentPhoto.thumbnail" 
                :src="currentPhoto.thumbnail" 
                :alt="currentPhoto.title + ' (预览)'" 
                class="blur-preview"
                loading="eager"
              />
              
              <!-- 高质量原图 - 点击后加载 -->
              <img 
                ref="mainImage" 
                :src="currentPhoto.original" 
                :alt="currentPhoto.title" 
                class="main-photo"
                :style="imageStyle"
                loading="lazy"
                @load="handleImageLoad"
                @error="handleImageError"
              />
              <!-- 关闭按钮 -->
              <button class="close-button" @click.stop="closeDetail" title="关闭">
                <el-icon><Close /></el-icon>
              </button>
              <!-- 缩放控制按钮 -->
              <div class="zoom-controls">
                <button class="zoom-btn" @click.stop="zoomIn" title="放大">
                  <el-icon><ZoomIn /></el-icon>
                </button>
                <button class="zoom-btn" @click.stop="zoomOut" title="缩小" :disabled="imageTransform.scale <= 1">
                  <el-icon><ZoomOut /></el-icon>
                </button>
                <button class="zoom-btn" @click.stop="resetZoom" title="重置">
                  <el-icon><Refresh /></el-icon>
                </button>
                <button class="zoom-btn" @click.stop="toggleExifPanel" :class="{ active: showExifPanel }" :title="showExifPanel ? '隐藏EXIF信息' : '显示EXIF信息'">
                  <el-icon><InfoFilled /></el-icon>
                </button>
              </div>
            </div>

            <!-- 照片导航箭头 -->
            <button 
              v-if="hasPreviousPhoto" 
              class="nav-arrow nav-arrow-left" 
              @click="prevPhoto"
              title="上一张"
            >
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <button 
              v-if="hasNextPhoto" 
              class="nav-arrow nav-arrow-right" 
              @click="nextPhoto"
              title="下一张"
            >
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>

          <!-- 右侧信息侧边栏 -->
          <div v-if="showExifPanel" class="info-sidebar">
            <!-- EXIF信息 -->
              <div>
            <!-- 基本信息 -->
            <div class="exif-section">
              <h3 class="exif-title">基本信息</h3>
              <div class="exif-content">
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">文件名</span>
                    <span class="param-value">{{ currentPhoto?.exif?.fileName || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">文件大小</span>
                    <span class="param-value">{{ currentPhoto?.exif?.fileSize || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">分辨率</span>
                    <span class="param-value">{{ currentPhoto?.exif ? `${currentPhoto.exif.width} × ${currentPhoto.exif.height}` : '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">像素</span>
                    <span class="param-value">{{ currentPhoto?.exif?.pixelCount || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">拍摄时间</span>
                    <span class="param-value">{{ currentPhoto?.exif?.shootTime || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">色彩空间</span>
                    <span class="param-value">{{ currentPhoto?.exif?.colorSpace || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">软件</span>
                    <span class="param-value">{{ currentPhoto?.exif?.software || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">时区</span>
                    <span class="param-value">{{ currentPhoto?.exif?.timezone || '-' }}</span>
                  </div>
                </div>
                <!-- 移除了国家和城市信息 -->
              </div>
            </div>

            <!-- 拍摄参数 -->
            <div class="exif-section">
              <h3 class="exif-title">拍摄参数</h3>
              <div class="exif-content">
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">光圈</span>
                    <span class="param-value">{{ currentPhoto?.exif?.aperture || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">快门</span>
                    <span class="param-value">{{ currentPhoto?.exif?.shutter || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">ISO</span>
                    <span class="param-value">{{ currentPhoto?.exif?.iso || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">焦距</span>
                    <span class="param-value">{{ currentPhoto?.exif?.focalLength || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 设备信息 -->
            <div class="exif-section">
              <h3 class="exif-title">设备信息</h3>
              <div class="exif-content">
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">相机</span>
                    <span class="param-value">{{ currentPhoto?.exif?.camera || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">镜头</span>
                    <span class="param-value">{{ currentPhoto?.exif?.lens || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">焦距</span>
                    <span class="param-value">{{ currentPhoto?.exif?.lensFocalLength || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">35mm 等效</span>
                    <span class="param-value">{{ currentPhoto?.exif?.focalLength35mm || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 位置信息 -->
            <div class="exif-section">
              <h3 class="exif-title">位置信息</h3>
              <div class="exif-content">
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">坐标</span>
                    <span class="param-value">
                      <div v-if="currentPhoto?.exif?.coordinates?.formattedLat" class="formatted-coordinate">{{ currentPhoto.exif.coordinates.formattedLat }}</div>
                      <div v-if="currentPhoto?.exif?.coordinates?.formattedLng" class="formatted-coordinate">{{ currentPhoto.exif.coordinates.formattedLng }}</div>
                      <span v-else>{{ currentPhoto?.exif?.coordinates ? `${currentPhoto.exif.coordinates.lat.toFixed(6)}, ${currentPhoto.exif.coordinates.lng.toFixed(6)}` : '-' }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 拍摄模式 -->
            <div class="exif-section">
              <h3 class="exif-title">拍摄模式</h3>
              <div class="exif-content">
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">白平衡</span>
                    <span class="param-value">{{ currentPhoto?.exif?.whiteBalance || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">曝光程序</span>
                    <span class="param-value">{{ currentPhoto?.exif?.exposureProgram || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">曝光模式</span>
                    <span class="param-value">{{ currentPhoto?.exif?.exposureMode || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">测光模式</span>
                    <span class="param-value">{{ currentPhoto?.exif?.meteringMode || '-' }}</span>
                  </div>
                </div>
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">闪光灯</span>
                    <span class="param-value">{{ currentPhoto?.exif?.flash || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">场景捕捉类型</span>
                    <span class="param-value">{{ currentPhoto?.exif?.sceneCaptureType || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 技术参数 -->
            <div class="exif-section">
              <h3 class="exif-title">技术参数</h3>
              <div class="exif-content">
                <div class="exif-row">
                  <div class="exif-param">
                    <span class="param-label">亮度</span>
                    <span class="param-value">{{ currentPhoto?.exif?.brightness || '-' }}</span>
                  </div>
                  <div class="exif-param">
                    <span class="param-label">感光方式</span>
                    <span class="param-value">{{ currentPhoto?.exif?.sensorType || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 直方图 -->
            <div class="exif-section">
              <h3 class="exif-title">直方图</h3>
              <div class="histogram-container">
                <canvas ref="histogramCanvas" width="300" height="100"></canvas>
              </div>
            </div>
            </div>
          </div>
        </div>
        <!-- 底部相册导航 -->
        <div class="gallery-section">
          <PhotoGalleryNav 
            :photos="relatedPhotos"
            :current-photo-id="currentPhoto.id"
            @photo-click="handleGalleryPhotoClick"
          />
        </div>
      </div>

      <!-- 加载失败提示 -->
      <div v-else-if="!loading" class="error-container">
        <div class="error-content">
          <i class="icon-error"></i>
          <h3>无法加载照片</h3>
          <p>请检查网络连接后重试</p>
          <button class="retry-button" @click="retryLoad">重试</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePhotoStore } from '../store/photoStore'
import PhotoGalleryNav from '../components/PhotoGalleryNav.vue'
import { ZoomIn, ZoomOut, Refresh, ArrowLeft, ArrowRight, Close, InfoFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const photoStore = usePhotoStore()

// 引用和状态
const canvasContainer = ref(null)
const histogramCanvas = ref(null)
const mainImage = ref(null)
const loading = ref(false)
const imageLoaded = ref(false)
const imageError = ref(false)
const lowQualityImageUrl = ref('')
// 存储图片的高光颜色
const dominantHighlightColor = ref('#0a0a0a') // 默认深色背景
// 响应式设计状态
const isMobile = ref(window.innerWidth <= 768)
// EXIF面板显示状态，手机端默认隐藏
const showExifPanel = ref(!isMobile.value)

// 图片控制状态
const imageTransform = reactive({
  scale: 1,
  translateX: 0,
  translateY: 0,
  rotation: 0
})

const navigateBack = () => {
  router.back()
}

// 切换EXIF面板显示状态
const toggleExifPanel = () => {
  showExifPanel.value = !showExifPanel.value
}
const isDragging = ref(false)
const previousMousePosition = reactive({ x: 0, y: 0 })

// 计算属性
const currentPhoto = computed(() => photoStore.currentPhoto || {})
const relatedPhotos = computed(() => photoStore.photos)
const currentIndex = computed(() => {
  if (!currentPhoto.value) return 0
  return relatedPhotos.value.findIndex(photo => photo.id === currentPhoto.value.id)
})
const hasPreviousPhoto = computed(() => currentIndex.value > 0)
const hasNextPhoto = computed(() => currentIndex.value < relatedPhotos.value.length - 1)
const imageStyle = computed(() => ({
  transform: `translate(${imageTransform.translateX}px, ${imageTransform.translateY}px) scale(${imageTransform.scale}) rotate(${imageTransform.rotation}deg)`,
  transition: imageLoaded.value ? 'opacity 0.5s ease-in-out' : 'none',
  opacity: imageLoaded.value ? 1 : 0
}))

// 计算背景样式 - 使用当前图片作为高斯模糊背景
const backgroundStyle = computed(() => {
  if (!currentPhoto.value || !currentPhoto.value.original) {
    return {}
  }
  
  return {
    backgroundImage: `url(${currentPhoto.value.original})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: 'blur(20px)',
    transform: 'scale(1.1)', // 略微放大背景以避免边缘空白
    opacity: 0.6 // 降低透明度以避免背景过于干扰
  }
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 图片处理函数（已优化，直接使用thumbnail）
const loadLowQualityPreview = (highQualityUrl) => {
  // 直接使用照片的thumbnail作为预览图
  lowQualityImageUrl.value = currentPhoto.value?.thumbnail || ''
}

// 处理图片加载完成
const handleImageLoad = () => {
  imageLoaded.value = true
  imageError.value = false
  
  // 添加淡入动画
  if (mainImage.value) {
    // 首先将透明度设置为0
    mainImage.value.style.opacity = 0
    
    // 强制重排
    mainImage.value.offsetHeight
    
    // 然后淡入
    setTimeout(() => {
      if (mainImage.value) {
        mainImage.value.style.opacity = 1
        // 获取图片高光颜色
        extractHighlightColor(mainImage.value)
      }
    }, 10)
  }
  
  // 加载完成后绘制直方图
  setTimeout(() => {
    drawHistogram()
  }, 200)
}

// 提取图片的高光颜色
const extractHighlightColor = (img) => {
  try {
    // 创建临时画布
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // 为了性能，使用较小的尺寸进行分析
    const scaledWidth = Math.min(100, img.width)
    const scaledHeight = Math.min(100, img.height)
    
    canvas.width = scaledWidth
    canvas.height = scaledHeight
    
    // 绘制图像到画布
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight).data
    
    // 存储亮度最高的像素颜色
    let maxBrightness = 0
    let highlightColor = { r: 10, g: 10, b: 10 } // 默认深色背景
    
    // 分析像素，寻找亮度最高的颜色（高光）
    // 为了性能，我们采样10%的像素
    const sampleRate = 0.1
    const totalPixels = scaledWidth * scaledHeight
    const sampleSize = Math.floor(totalPixels * sampleRate)
    
    for (let i = 0; i < sampleSize; i++) {
      // 随机采样，避免处理所有像素
      const pixelIndex = Math.floor(Math.random() * totalPixels) * 4
      
      const r = imageData[pixelIndex]
      const g = imageData[pixelIndex + 1]
      const b = imageData[pixelIndex + 2]
      
      // 计算亮度（使用感知亮度公式）
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b
      
      // 只考虑亮度较高的像素作为高光
      if (brightness > maxBrightness && brightness > 128) {
        maxBrightness = brightness
        highlightColor = { r, g, b }
      }
    }
    
    // 如果没有找到足够亮的高光，使用默认颜色
    if (maxBrightness === 0) {
      highlightColor = { r: 10, g: 10, b: 10 }
    }
    
    // 转换为十六进制颜色
    dominantHighlightColor.value = `#${[
      highlightColor.r.toString(16).padStart(2, '0'),
      highlightColor.g.toString(16).padStart(2, '0'),
      highlightColor.b.toString(16).padStart(2, '0')
    ].join('')}`
    
  } catch (error) {
    console.warn('无法提取图片高光颜色:', error)
    // 出错时使用默认颜色
    dominantHighlightColor.value = '#0a0a0a'
  }
}

// 处理图片加载错误
const handleImageError = () => {
  console.warn('高质量照片加载失败，使用预览图替代')
  imageError.value = true
  // 即使原图加载失败，也设置为已加载状态，以便显示预览图
  imageLoaded.value = true
  
  // 如果有预览图，确保它可见
  const blurPreview = document.querySelector('.blur-preview')
  if (blurPreview) {
    blurPreview.style.opacity = '1'
    blurPreview.style.filter = 'none' // 移除模糊效果
    blurPreview.classList.add('error-replacement')
  }

// 加载模拟直方图
  setTimeout(() => {
    drawHistogram()
  }, 100)
}

// 鼠标事件处理
const handleMouseDown = (event) => {
  // 只有当图片放大时才允许拖拽
  if (imageTransform.scale <= 1) return
  
  // 阻止默认行为，防止文本选择等干扰
  event.preventDefault()
  
  isDragging.value = true
  previousMousePosition.x = event.clientX
  previousMousePosition.y = event.clientY
}

const handleMouseMove = (event) => {
  if (!isDragging.value) return
  
  // 阻止默认行为
  event.preventDefault()
  
  const deltaX = event.clientX - previousMousePosition.x
  const deltaY = event.clientY - previousMousePosition.y
  
  // 应用平移
  imageTransform.translateX += deltaX
  imageTransform.translateY += deltaY
  
  previousMousePosition.x = event.clientX
  previousMousePosition.y = event.clientY
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleDoubleClick = () => {
  if (imageTransform.scale !== 1) {
    resetZoom()
  } else {
    zoomTo(1.5)
  }
}

// 缩放控制函数
const handleWheel = (event) => {
  event.preventDefault()
  
  // 当图片处于默认大小或更小（scale <= 1）时，不允许缩小
  const isZoomingOut = event.deltaY > 0
  if (isZoomingOut && imageTransform.scale <= 1) {
    return // 不执行缩小操作
  }
  
  const delta = isZoomingOut ? -0.1 : 0.1
  const newScale = Math.max(1, Math.min(5, imageTransform.scale + delta))
  
  // 获取鼠标在图片上的位置
  const rect = mainImage.value?.getBoundingClientRect()
  if (!rect) return
  
  // 获取鼠标在容器中的位置
  const containerRect = event.currentTarget.getBoundingClientRect()
  const mouseX = event.clientX - containerRect.left
  const mouseY = event.clientY - containerRect.top
  
  // 计算容器中心点
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2
  
  // 计算鼠标相对于容器中心的位置
  const offsetX = mouseX - centerX
  const offsetY = mouseY - centerY
  
  // 计算缩放比例
  const scaleRatio = newScale / imageTransform.scale
  
  // 调整位置，使鼠标指向的点保持不动
  imageTransform.translateX = (imageTransform.translateX + offsetX) * scaleRatio - offsetX
  imageTransform.translateY = (imageTransform.translateY + offsetY) * scaleRatio - offsetY
  
  // 应用缩放
  imageTransform.scale = newScale
}

const zoomIn = () => {
  imageTransform.scale = Math.min(5, imageTransform.scale * 1.2)
}

const zoomOut = () => {
  // 只有当图片被放大过（scale > 1）时才允许缩小
  if (imageTransform.scale > 1) {
    imageTransform.scale = Math.max(1, imageTransform.scale / 1.2)
  }
}

const zoomTo = (targetScale) => {
  imageTransform.scale = targetScale
  imageTransform.translateX = 0
  imageTransform.translateY = 0
}

const resetZoom = () => {
  imageTransform.scale = 1
  imageTransform.translateX = 0
  imageTransform.translateY = 0
  imageTransform.rotation = 0
}

// 关闭详情页 - 无论切换了多少图片，都直接回到首页
const closeDetail = () => {
  router.push({ name: 'Home' })
}

// 处理窗口大小变化
const handleResize = () => {
  // 在窗口大小变化时可以添加适当的响应式调整
  if (imageTransform.scale === 1) {
    resetZoom()
  }
}

// 生成模拟直方图数据的辅助函数
const generateMockHistogramData = (red, green, blue, gray) => {
  // 生成平滑的高斯分布直方图
  const center = Math.floor(Math.random() * 50) + 100 // 随机中心点在100-150之间
  const spread = Math.floor(Math.random() * 20) + 20 // 随机分布范围在20-40之间
  
  for (let i = 0; i < 256; i++) {
    // 高斯分布公式
    const value = Math.exp(-Math.pow(i - center, 2) / (2 * Math.pow(spread, 2))) * 500
    
    // 为每个通道生成略有不同的数据
    red[i] = Math.floor(value * (0.8 + Math.random() * 0.4))
    green[i] = Math.floor(value * (0.9 + Math.random() * 0.3))
    blue[i] = Math.floor(value * (0.7 + Math.random() * 0.5))
    
    // 灰度值是RGB的加权平均
    gray[i] = Math.floor(0.299 * red[i] + 0.587 * green[i] + 0.114 * blue[i])
  }
}

// 绘制直方图
const drawHistogram = () => {
  if (!histogramCanvas.value || !mainImage.value) return
  
  const canvas = histogramCanvas.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 检查图片状态，如果图片无效则使用模拟数据
  const img = mainImage.value
  let red = new Array(256).fill(0)
  let green = new Array(256).fill(0)
  let blue = new Array(256).fill(0)
  let gray = new Array(256).fill(0)
  
  // 检查图片是否有效且未损坏
  if (img.complete && img.naturalHeight > 0 && !img.onerror) {
    try {
      // 创建临时画布来分析图像
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')
      
      // 设置临时画布尺寸为较小的尺寸以提高性能
      const scaledWidth = Math.min(100, img.width)
      const scaledHeight = Math.min(100, img.height)
      
      tempCanvas.width = scaledWidth
      tempCanvas.height = scaledHeight
      
      // 绘制图像到临时画布
      tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
      
      // 获取图像数据
      const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight).data
      
      // 初始化通道直方图数据
      red = new Array(256).fill(0)
      green = new Array(256).fill(0)
      blue = new Array(256).fill(0)
      gray = new Array(256).fill(0)
      
      // 计算直方图数据
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i]
        const g = imageData[i + 1]
        const b = imageData[i + 2]
        
        // 累加各通道值
        red[r]++
        green[g]++
        blue[b]++
        
        // 计算灰度值 (标准灰度转换公式)
        const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        gray[grayValue]++
      }
    } catch (error) {
      console.warn('无法分析图像数据，使用模拟直方图数据:', error)
      // 图片分析失败，使用模拟数据
      generateMockHistogramData(red, green, blue, gray)
    }
  } else {
    // 图片无效，使用模拟数据
    generateMockHistogramData(red, green, blue, gray)
  }
  
  // 找出最大值以便归一化
  const maxRed = Math.max(...red)
  const maxGreen = Math.max(...green)
  const maxBlue = Math.max(...blue)
  const maxGray = Math.max(...gray)
  const maxValue = Math.max(maxRed, maxGreen, maxBlue, maxGray)
  
  try {
    // 获取图像数据
    const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight).data
    
    // 初始化通道直方图数据
    const red = new Array(256).fill(0)
    const green = new Array(256).fill(0)
    const blue = new Array(256).fill(0)
    const gray = new Array(256).fill(0)
    
    // 计算直方图数据
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i]
      const g = imageData[i + 1]
      const b = imageData[i + 2]
      
      // 累加各通道值
      red[r]++
      green[g]++
      blue[b]++
      
      // 计算灰度值 (标准灰度转换公式)
      const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      gray[grayValue]++
    }
    
    // 绘制背景
    ctx.fillStyle = '#f8f9fa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制网格背景线
    ctx.strokeStyle = '#e9ecef'
    ctx.lineWidth = 0.5
    // 水平网格线
    for (let i = 0; i <= 4; i++) {
      const y = (canvas.height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    // 垂直网格线
    for (let i = 0; i <= 8; i++) {
      const x = (canvas.width / 8) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    
    // 绘制直方图函数
    const drawChannel = (data, color, alpha = 0.7) => {
      ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0')
      const barWidth = canvas.width / 256
      
      for (let i = 0; i < 256; i++) {
        if (maxValue === 0) continue
        const value = data[i]
        const barHeight = (value / maxValue) * canvas.height * 0.9
        
        ctx.fillRect(
          i * barWidth,
          canvas.height - barHeight,
          Math.max(1, barWidth),
          barHeight
        )
      }
    }
    
    // 先绘制RGB通道
    drawChannel(red, '#ff', 0.5)     // 红色
    drawChannel(green, '#00ff', 0.5)  // 绿色
    drawChannel(blue, '#0000ff', 0.5) // 蓝色
    
    // 最后绘制叠加的灰度直方图（轮廓）
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < 256; i++) {
      if (maxValue === 0) continue
      const value = gray[i]
      const x = (canvas.width / 256) * i
      const y = canvas.height - (value / maxValue) * canvas.height * 0.9
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    
  } catch (error) {
    console.warn('无法提取图像数据，使用模拟直方图:', error)
    // 回退到模拟数据
    drawSimulatedHistogram(ctx, canvas.width, canvas.height)
  }
}

// 绘制模拟直方图（当无法访问图像数据时使用）
const drawSimulatedHistogram = (ctx, width, height) => {
  // 生成模拟直方图数据
  const generateData = (peakPosition, amplitude) => {
    return Array.from({ length: 256 }, (_, i) => {
      // 使用高斯分布生成更真实的直方图形状
      const distance = Math.abs(i - peakPosition)
      const gaussian = Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(amplitude, 2)))
      return Math.floor(gaussian * 100)
    })
  }
  
  const red = generateData(200, 50) // 高光区域偏红
  const green = generateData(128, 80) // 中等亮度区域偏绿
  const blue = generateData(50, 60) // 阴影区域偏蓝
  const gray = Array.from({ length: 256 }, (_, i) => {
    return Math.floor(red[i] * 0.3 + green[i] * 0.5 + blue[i] * 0.2)
  })
  
  // 绘制背景
  ctx.fillStyle = '#f8f9fa'
  ctx.fillRect(0, 0, width, height)
  
  // 绘制网格背景线
  ctx.strokeStyle = '#e9ecef'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 绘制RGB通道
  const maxValue = 100
  const barWidth = width / 256
  
  // 红色通道
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
  red.forEach((value, i) => {
    const barHeight = (value / maxValue) * height * 0.9
    ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth), barHeight)
  })
  
  // 绿色通道
  ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'
  green.forEach((value, i) => {
    const barHeight = (value / maxValue) * height * 0.9
    ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth), barHeight)
  })
  
  // 蓝色通道
  ctx.fillStyle = 'rgba(0, 0, 255, 0.5)'
  blue.forEach((value, i) => {
    const barHeight = (value / maxValue) * height * 0.9
    ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth), barHeight)
  })
  
  // 灰度轮廓
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  gray.forEach((value, i) => {
    const x = (width / 256) * i
    const y = height - (value / maxValue) * height * 0.9
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
};

// 导航功能
const prevPhoto = () => {
  if (currentIndex.value > 0) {
    const prevPhoto = relatedPhotos.value[currentIndex.value - 1]
    if (prevPhoto) {
      goToPhoto(prevPhoto.id)
    }
  }
}

const nextPhoto = () => {
  if (currentIndex.value < relatedPhotos.value.length - 1) {
    const nextPhoto = relatedPhotos.value[currentIndex.value + 1]
    if (nextPhoto) {
      goToPhoto(nextPhoto.id)
    }
  }
}

// 简化过渡逻辑，移除背景切换效果
const isTransitioning = ref(false)

const goToPhoto = async (id) => {
  // 如果点击的是当前照片或正在切换中，不执行任何操作
  if (parseInt(id) === parseInt(currentPhoto.value?.id) || isTransitioning.value) {
    return
  }
  
  isTransitioning.value = true
  
  // 获取下一张照片信息
  const nextPhoto = relatedPhotos.value.find(photo => photo.id === id)
  if (!nextPhoto) {
    isTransitioning.value = false
    return
  }
  
  // 预加载下一张图片
  const preloadImage = new Image()
  const loadPromise = new Promise((resolve) => {
    preloadImage.onload = resolve
    preloadImage.onerror = resolve // 即使加载失败也继续切换
    preloadImage.src = nextPhoto.original
  })
  
  // 等待图片预加载完成，确保有足够的时间加载下一张图片
  await loadPromise
  
  // 重置图片状态
  resetZoom()
  imageLoaded.value = false
  
  // 加载照片详情
  await loadPhotoDetail(id)
  
  // 更新URL，使用replace选项避免历史记录堆积
  router.push({ name: 'PhotoDetail', params: { id } }, undefined, { replace: true })
  
  // 加载低质量预览图
  if (currentPhoto.value?.original) {
    loadLowQualityPreview(currentPhoto.value.original)
  }
  
  // 等待DOM更新，确保新图片已经绑定到src
  await nextTick()
  
  // 延迟一小段时间让新图片开始加载
  await new Promise(resolve => setTimeout(resolve, 50))
  
  isTransitioning.value = false
}

const handleGalleryPhotoClick = (id) => {
  goToPhoto(id)
}

const goBack = () => {
  router.push({ name: 'Home' })
}

// 重试加载
const retryLoad = async () => {
  const id = route.params.id
  if (id) {
    await loadPhotoDetail(parseInt(id))
  }
}

// 加载照片详情
const loadPhotoDetail = async (id) => {
  if (!id) return
  
  loading.value = true
  try {
    await photoStore.getPhotoDetail(id)
    // 如果照片列表为空或只有当前照片，加载更多照片用于导航
    if (relatedPhotos.value.length < 5) {
      await photoStore.loadPhotos()
    }
    
    // 加载低质量预览图
    if (currentPhoto.value?.original) {
      loadLowQualityPreview(currentPhoto.value.original)
    }
  } catch (error) {
    console.error('加载照片详情失败:', error)
    imageError.value = true
  } finally {
    loading.value = false
  }
}

// 监听路由变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadPhotoDetail(parseInt(newId))
  }
}, { immediate: true })

// 监听照片变化，重新绘制直方图
watch(() => currentPhoto.value.id, () => {
  if (currentPhoto.value.id) {
    setTimeout(() => {
      drawHistogram()
    }, 100)
  }
})

// 组件挂载
onMounted(() => {
  // 添加键盘导航
  document.addEventListener('keydown', handleKeydown)
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
  
  // 如果没有照片数据，加载一些用于导航
  if (relatedPhotos.value.length === 0) {
    photoStore.loadPhotos()
  }
})

// 组件销毁前清理资源
onBeforeUnmount(() => {
  // 移除事件监听器
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  
  // 重置状态
  loading.value = false
  imageLoaded.value = false
})

// 键盘导航
const handleKeydown = (event) => {
  switch (event.key) {
    case 'ArrowLeft':
      prevPhoto();
      break;
    case 'ArrowRight':
      nextPhoto();
      break;
    case 'Escape':
      closeDetail();
      break;
  }
};
</script>

<style scoped>
/* 全局样式重置和变量 */
:root {
  --primary-color: #00bcd4;
  --secondary-color: #6c757d;
  --bg-primary: #000000;
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

/* 全局文本颜色确保为白色 */
.photo-detail * {
  color: white !important;
}

/* 确保链接和按钮文本也是白色 */
.photo-detail a,
.photo-detail button {
  color: white !important;
}

/* 确保输入框和选择框文本也是白色 */
.photo-detail input,
.photo-detail select,
.photo-detail textarea {
  color: white !important;
}

/* 背景图容器 - 固定在最底层 */
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  transition: background-image 0.5s ease-in-out;
}

/* 照片详情容器 */
.photo-detail-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  overflow: hidden;
}

/* 照片详情内容区域 */
.photo-detail {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2;
  position: relative;
}

/* 页面头部导航 */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 2rem;
  background-color: rgba(12, 12, 12, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s ease;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.95rem;
  font-weight: 500;
  backdrop-filter: blur(5px);
}

.back-button:hover {
  background-color: var(--primary-color);
  color: #ffffff;
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.page-title {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.5px;
}

.header-spacer {
  width: 120px;
}

/* 骨架屏样式 */
.skeleton-container {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 1rem;
  padding: 1rem;
  height: calc(100vh - 80px);
  animation: skeleton-loading 1.5s linear infinite alternate;
}

.skeleton-image {
  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  border-radius: var(--border-radius);
  overflow: hidden;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius);
  border-left: 1px solid var(--border-color);
}

.skeleton-title {
  height: 2rem;
  width: 70%;
  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  border-radius: 4px;
}

.skeleton-date {
  height: 1.25rem;
  width: 50%;
  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  border-radius: 4px;
}

.skeleton-param {
  height: 2rem;
  width: 100%;
  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 主要内容区域 */
.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 添加过渡效果，确保内容切换平滑 */
  transition: opacity 0.3s ease;
}

.main-layout {
  flex: 1;
  display: flex;
  height: calc(100% - 80px);
  overflow: hidden;
  position: relative;
  z-index: 2; /* 确保在背景之上 */
  background: transparent; /* 确保透明，不遮挡背景 */
  /* 添加过渡效果，避免布局闪烁 */
  transition: all 0.3s ease;
}

/* 照片展示区域 */
.photo-display-area {
  position: relative;
  background-color: transparent; /* 改为透明背景，让高斯模糊背景可见 */
  border-radius: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  height: 100%;
  flex: 1; /* 让照片区域填充剩余空间 */
  /* 设置z-index确保显示在背景上方 */
  z-index: 10;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: grab;
  overflow: hidden;
  background-color: transparent; /* 改为透明背景，让高斯模糊背景可见 */
}

.image-container:active {
  cursor: grabbing;
}

/* 当图片可拖拽时的样式 */
.image-container.draggable {
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.image-container.draggable:active {
  cursor: grabbing;
}

/* 加载占位符 - 修改为透明背景，使用缩略图作为模糊背景 */
.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  z-index: 10;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

.loading-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 低质量预览图 - 增强高斯模糊效果，使其在加载过程中更明显 */
.blur-preview {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(15px);
  opacity: 0.8;
  transition: opacity 0.5s ease, filter 0.5s ease;
  z-index: 5;
  transform: scale(1.1); /* 略微放大以避免边缘空白 */
}

/* 正常加载完成时隐藏预览图 */
.image-loaded .blur-preview:not(.error-replacement) {
  opacity: 0;
  filter: blur(0px);
}

/* 错误状态下的预览图样式 */
.blur-preview.error-replacement {
  filter: none !important;
  opacity: 1 !important;
  z-index: 3 !important;
  object-fit: contain;
  transform: scale(1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* 确保加载占位符在错误状态下隐藏 */
.image-loaded .image-placeholder {
  display: none;
}

/* 高质量原图 */
.main-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 20;
  /* 移除fadeIn动画，避免内容从上到下显示 */
}

/* 过渡背景层样式 - 在图片切换时显示上一张图片 */
.transition-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  z-index: 10;
  pointer-events: none;
}

/* 过渡效果样式 */
.fade-out {
  opacity: 0 !important;
  transition: opacity 0.3s ease;
}

.fade-in {
  opacity: 1 !important;
  transition: opacity 0.3s ease;
}

.main-photo.fade-out {
  opacity: 0;
  transition: opacity 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 关闭按钮样式 - 右上角 */
.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .close-button {
  opacity: 1;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.9);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* 缩放控制按钮 - 右下角 */
.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-container:hover .zoom-controls {
  opacity: 1;
}

.zoom-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(30, 30, 30, 0.7);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1.2rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  text-align: center;
  line-height: 1;
  padding: 0;
}

.zoom-btn i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.2rem;
  transform: none !important;
  flex-shrink: 0;
}

.zoom-btn:hover {
  background-color: var(--primary-color);
  color: #ffffff;
  transform: scale(1.1);
}

/* 导航箭头 */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(30, 30, 30, 0.6);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  z-index: 30;
  opacity: 0;
  text-align: center;
  line-height: 1;
  padding: 0;
}

.nav-arrow i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1.75rem;
  transform: none !important;
  flex-shrink: 0;
}

.photo-display-area:hover .nav-arrow {
  opacity: 0.8;
}

.nav-arrow:hover {
  background-color: var(--primary-color);
  color: #ffffff;
  opacity: 1;
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow-left {
  left: 20px;
}

.nav-arrow-right {
  right: 20px;
}

/* 已在上方定义关闭按钮样式 */

/* 主布局样式 */
.main-layout::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* 确保伪元素在底层 */
  z-index: 1;
  /* 防止伪元素溢出容器 */
  overflow: hidden;
  pointer-events: none;
  /* 移除所有背景相关样式 */
  opacity: 0;
}

/* 信息侧边栏样式 */
.info-sidebar {
  background-color: rgba(74, 74, 74, 0.3);
  border-radius: 0;
  padding: 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  font-size: 0.8rem;
  width: 300px; /* 设置固定宽度 */
  transition: all 0.3s ease;
  flex-shrink: 0; /* 防止缩小 */
  min-width: 280px;
  /* 设置z-index确保显示在背景上方 */
  z-index: 10;
  position: relative;
}

/* 现代滚动条样式 - WebKit浏览器 */
.info-sidebar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.info-sidebar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 2px;
}

.info-sidebar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.info-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(209, 213, 219, 0.7);
}

.info-sidebar::-webkit-scrollbar-thumb:active {
  background: rgba(255, 255, 255, 0.8);
}

/* 照片基本信息 */
.photo-info {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.photo-title {
  margin: 0 0 0.3rem 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-date {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* EXIF信息样式 */
.exif-info {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.exif-title {
  color: white;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.exif-content {
  width: 100%;
}

.exif-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.8rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.exif-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.exif-param {
  flex: 1;
  padding: 0 10px;
}

.exif-param:first-child {
  padding-left: 0;
}

.exif-param:last-child {
  padding-right: 0;
}

.param-label {
  color: white;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  display: block;
  margin-bottom: 6px;
  opacity: 0.9;
}

.param-value {
  color: white;
  font-size: 16px;
  font-weight: 700;
  display: block;
  letter-spacing: 0.3px;
}

/* 位置信息 */
.location-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 20px;
  padding: 15px;
  border-radius: 12px;
  /* 磨砂玻璃效果 */
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.location-name {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.coordinates {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

/* 直方图区域 */
.histogram-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 20px;
  padding: 15px;
    border-radius: 8px;
    /* 磨砂玻璃效果 */
}

.exif-section {
  background: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: none;
  margin-bottom: 0.8rem;
  padding: 0;
  border-radius: 0;
}

.exif-section:hover {
  /* 移除悬停效果 */
}

.exif-param:hover {
  /* 移除悬停效果 */
}
.exif-title {
  margin: 0 0 0.6rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.exif-section:first-of-type .exif-title {
  border-top: none;
  padding-top: 0;
}

.section-title {
  margin: 0 0 0.8rem 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.histogram-container {
  width: 100%;
  height: 60px;
  background-color: #0a0a0a;
  border-radius: 0;
  overflow: hidden;
  animation: fadeInUp 0.8s ease-out;
}

.no-exif-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
}

.message-content {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 8px;
  border: 1px dashed #666;
}

.message-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 相册导航区域 */
.gallery-section {
  background-color: rgba(129, 127, 127, 0.3);
  padding: 0;
  /* 替换animation为transition，确保内容切换平滑 */
  transition: opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: var(--border-radius);
  color: white;
  box-shadow: 0 -4px 20px rgba(103, 103, 103, 0.5);
}

/* 照片过渡容器 */
.photo-transition-container {
  position: relative;
  width: 100%;
  height: 100%;
}

/* 滚动时的渐入效果 */
.info-sidebar > * {
  opacity: 0;
  animation: fadeInUp 0.5s ease-out forwards;
}

.info-sidebar > *:nth-child(1) { animation-delay: 0.1s; }
.info-sidebar > *:nth-child(2) { animation-delay: 0.2s; }
.info-sidebar > *:nth-child(3) { animation-delay: 0.3s; }
.info-sidebar > *:nth-child(4) { animation-delay: 0.4s; }

.gallery-heading {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* 信息卡片 */
.info-card {
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: var(--transition);
  /* 磨砂玻璃效果 */
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.photo-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.photo-date {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.card-section {
  margin-bottom: 1.5rem;
}

.card-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* EXIF参数网格 */
.exif-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.exif-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: var(--bg-primary);
  border-radius: 8px;
  transition: var(--transition);
}

.exif-item:hover {
  background-color: rgba(58, 123, 213, 0.05);
}

.param-icon {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
}

.param-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: normal;
}

.param-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* 位置信息 */
.location-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--bg-primary);
  border-radius: 8px;
}

.location-icon {
  font-size: 1.25rem;
  margin-top: 0.1rem;
}

.location-details {
  flex: 1;
}

.location-name {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
  font-size: 1rem;
}

.coordinates {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* 直方图容器 */
.histogram-container {
  width: 100%;
  height: 100px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  padding: 0.5rem;
}

.gallery-heading {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

/* 错误提示 */
.error-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-content i {
  font-size: 4rem;
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-content h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.error-content p {
  color: var(--text-secondary);
  margin: 0 0 1.5rem 0;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: var(--transition);
}

.retry-button:hover {
  background-color: #2a66c0;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .info-cards-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .detail-header {
    padding: 0.75rem 1rem;
  }
  
  .page-title {
    font-size: 1rem;
  }
  
  .header-spacer {
    width: 40px;
  }
  
  .detail-content {
    padding: 1rem;
    gap: 1rem;
  }
  
  .photo-display-area {
    min-height: 50vh;
    max-height: 60vh;
  }
  
  .nav-arrow {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
  
  .nav-arrow-left {
    left: 10px;
  }
  
  .nav-arrow-right {
    right: 10px;
  }
  
  .zoom-controls {
    bottom: 10px;
    right: 10px;
  }
  
  .zoom-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .exif-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .skeleton-container {
    flex-direction: column;
    padding: 1rem;
  }
  
  .skeleton-image {
    height: 50vh;
  }
}

@media (max-width: 480px) {
  .back-button {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
  
  .photo-title {
    font-size: 1.25rem;
  }
  
  .exif-grid {
    grid-template-columns: 1fr;
  }
}

/* 图标样式（使用文本代替图标字体） */
.icon-arrow-left::before { content: '←'; }
.icon-zoom-in::before { content: '+'; }
.icon-zoom-out::before { content: '−'; }
.icon-reset::before { content: '⟳'; }
.icon-angle-left::before { content: '‹'; }
.icon-angle-right::before { content: '›'; }
.icon-error::before { content: '⚠️'; }
.icon-times::before { content: '×'; }
</style>
