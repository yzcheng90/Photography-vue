import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchPhotoList, fetchPhotoDetail } from '../services/photoApiCos'
// import { fetchPhotoList, fetchPhotoDetail } from '../services/photoApi'
import exifr from 'exifr'

export const usePhotoStore = defineStore('photo', {
  state: () => ({
    photos: [],
    currentPhoto: null,
    loading: false,
    error: null,
    page: 1,
    pageSize: 20,
    hasMore: true,
    // 图片加载缓存，避免重复下载
    _imageCache: new Map(),
    _exifCache: new Map()
  }),
  
  getters: {
    getPhotoById: (state) => (id) => {
      return state.photos.find(photo => photo.id === parseInt(id)) || null
    }
  },
  
  actions: {
    
    // 确保照片对象存在基础EXIF占位数据
    _ensurePhotoExifStub(photo) {
      if (!photo || photo.exif) return
      const imageUrl =
        photo.original ||
        photo.originalUrl ||
        photo.thumbnail ||
        photo.thumbnailUrl ||
        photo.fileName ||
        photo.key ||
        'unknown.jpg'
      photo.exif = this.getBasicExifData(imageUrl)
    },
    
    // 格式化文件大小
    _formatFileSize(sizeInBytes) {
      if (!sizeInBytes || sizeInBytes === 0) return '-'
      if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`
      } else if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(2)} KB`
      } else {
        return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
      }
    },
    
    // 获取文件大小（使用缓存）
    async getFileSize(url) {
      // 检查缓存
      if (this._imageCache.has(url)) {
        const cached = this._imageCache.get(url)
        if (cached && cached.size) {
          return this._formatFileSize(cached.size)
        }
      }
      
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          cache: 'default' // 使用缓存
        })
        
        if (response.ok) {
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            const sizeInBytes = parseInt(contentLength)
            // 更新缓存
            const cached = this._imageCache.get(url) || {}
            cached.size = sizeInBytes
            this._imageCache.set(url, cached)
            return this._formatFileSize(sizeInBytes)
          }
        }
      } catch (error) {
        // 静默失败
      }
      return '-'
    },

    // 检测图片格式
    getImageFormat(imageUrl) {
      // 从URL或文件名中提取扩展名
      const extension = imageUrl.split('.').pop()?.toLowerCase() || ''
      
      if (extension.includes('webp')) {
        return 'webp'
      } else if (extension.includes('jpeg') || extension.includes('jpg')) {
        return 'jpeg'
      } else if (extension.includes('png')) {
        return 'png'
      } else if (extension.includes('tiff') || extension.includes('tif')) {
        return 'tiff'
      } else {
        return 'unknown'
      }
    },
    
    // 一次性获取图片的所有信息（尺寸、EXIF、文件大小），避免重复下载
    async _loadImageData(imageUrl) {
      // 检查缓存
      if (this._imageCache.has(imageUrl)) {
        return this._imageCache.get(imageUrl)
      }
      
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        
        // 设置超时
        const timeout = setTimeout(() => {
          resolve({
            dimensions: { width: 1200, height: 800 },
            size: null,
            loaded: false
          })
        }, 5000)
        
        img.onload = () => {
          clearTimeout(timeout)
          const data = {
            dimensions: { width: img.width, height: img.height },
            size: null, // 文件大小需要单独获取
            loaded: true
          }
          // 缓存结果
          this._imageCache.set(imageUrl, data)
          resolve(data)
        }
        
        img.onerror = () => {
          clearTimeout(timeout)
          const data = {
            dimensions: { width: 1200, height: 800 },
            size: null,
            loaded: false
          }
          this._imageCache.set(imageUrl, data)
          resolve(data)
        }
        
        img.src = imageUrl
      })
    },
    
    // 获取图片EXIF信息（优化版，减少重复下载）
    async getExifForUrl(imageUrl) {
      // 检查EXIF缓存
      if (this._exifCache.has(imageUrl)) {
        return this._exifCache.get(imageUrl)
      }
      
      try {
        const format = this.getImageFormat(imageUrl)
        
        // 对于JPEG和TIFF，尝试使用exifr解析（exifr会下载图片）
        if (['jpeg', 'tiff'].includes(format)) {
          try {
            // exifr.parse 会下载图片，我们同时获取图片数据
            const [exifData, imageData] = await Promise.allSettled([
              exifr.parse(imageUrl, {
                exif: true,
                gps: true,
                translateValues: true,
                mergeOutput: true,
                chunked: true,
                maxBufferSize: 3 * 1024 * 1024, // 进一步减少到3MB
                timeout: 2000 // 减少超时时间到2秒
              }),
              this._loadImageData(imageUrl) // 同时加载图片获取尺寸
            ]).then(results => [
              results[0].status === 'fulfilled' ? results[0].value : null,
              results[1].status === 'fulfilled' ? results[1].value : { dimensions: null, size: null }
            ])
            
            // 如果EXIF解析成功
            if (exifData && Object.keys(exifData).length > 0) {
              // 获取文件大小（使用HEAD请求，不下载完整文件）
              const fileSize = await this.getFileSize(imageUrl)
              
              const formatted = this.formatExifData(
                exifData,
                imageData.dimensions,
                fileSize,
                imageUrl
              )
              
              // 缓存结果
              this._exifCache.set(imageUrl, formatted)
              return formatted
            }
          } catch (exifError) {
            // 静默失败
          }
        }
        
        // 对于其他格式或EXIF解析失败，只获取基本尺寸信息
        const imageData = await this._loadImageData(imageUrl)
        const fileSize = await this.getFileSize(imageUrl)
        
        const basicData = this.getBasicExifData(imageUrl)
        const result = {
          ...basicData,
          fileSize: fileSize || '-',
          width: imageData.dimensions?.width || '-',
          height: imageData.dimensions?.height || '-',
          pixelCount: (imageData.dimensions?.width && imageData.dimensions?.height)
            ? `${((imageData.dimensions.width * imageData.dimensions.height) / 1000000).toFixed(2)} MP`
            : '-'
        }
        
        // 缓存结果
        this._exifCache.set(imageUrl, result)
        return result
      } catch (error) {
        const result = this.getBasicExifData(imageUrl)
        this._exifCache.set(imageUrl, result)
        return result
      }
    },
    
    // 获取图片尺寸（使用缓存）
    async getImageDimensions(imageUrl) {
      const imageData = await this._loadImageData(imageUrl)
      return imageData.dimensions || { width: 1200, height: 800 }
    },

    // 格式化EXIF数据
    formatExifData(exifData, dimensions, fileSize, imageUrl) {
      // 从URL提取文件名
      const fileName = imageUrl.split('/').pop() || 'photo.jpg';
      
      // 检查exifData是否已经是格式化的格式（有fileName等字段）
      if (exifData && exifData.fileName) {
        // 如果已经是格式化的格式，只更新尺寸和文件大小等信息
        return {
          ...exifData,
          width: dimensions?.width || exifData.width || '-',
          height: dimensions?.height || exifData.height || '-',
          fileSize: fileSize || exifData.fileSize || '-',
          // 重新计算像素数量
          pixelCount: (dimensions?.width && dimensions?.height)
            ? `${((dimensions.width * dimensions.height) / 1000000).toFixed(2)} MP`
            : exifData.pixelCount || '-'
        };
      }
      
      // 如果没有EXIF数据或格式不完整，返回基本字段但不填充默认值
      if (!exifData || (!exifData.Make && !exifData.isMockData)) {
        // 只返回基础信息，不使用模拟数据
        return {
          fileName,
          fileSize: fileSize || '-',
          width: dimensions?.width || '-',
          height: dimensions?.height || '-',
          pixelCount: (dimensions?.width && dimensions?.height)
            ? `${((dimensions.width * dimensions.height) / 1000000).toFixed(2)} MP`
            : '-',
          shootTime: '-',
          colorSpace: '-',
          software: '-',
          timezone: '-',
          coordinates: null,
          focalLength: '-',
          aperture: '-',
          shutter: '-',
          iso: '-',
          camera: '-',
          lens: '-',
          lensFocalLength: '-',
          focalLength35mm: '-',
          whiteBalance: '-',
          exposureProgram: '-',
          exposureMode: '-',
          meteringMode: '-',
          flash: '-',
          sceneCaptureType: '-',
          brightness: '-',
          sensorType: '-',
          isMockData: false
        };
      }
      
      // 处理标准EXIF数据，但只保留实际存在的值，不存在的值用'-'
      return {
        fileName,
        fileSize: fileSize || '-',
        width: dimensions?.width || exifData.ImageWidth || exifData.Width || exifData.PixelXDimension || '-',
        height: dimensions?.height || exifData.ImageHeight || exifData.Height || exifData.PixelYDimension || '-',
        pixelCount: (dimensions?.width && dimensions?.height)
          ? `${((dimensions.width * dimensions.height) / 1000000).toFixed(2)} MP`
          : (exifData.ImageWidth && exifData.ImageHeight)
          ? `${((exifData.ImageWidth * exifData.ImageHeight) / 1000000).toFixed(2)} MP`
          : '-',
        shootTime: exifData.DateTimeOriginal ||
                   exifData.ModifyDate ||
                   exifData.CreateDate ||
                   exifData.DateTime ||
                   exifData.DateCreated
          ? this.formatDateTime(exifData.DateTimeOriginal ||
                                exifData.ModifyDate ||
                                exifData.CreateDate ||
                                exifData.DateTime ||
                                exifData.DateCreated)
          : '-',
        colorSpace: exifData.ColorSpace ? this.getColorSpaceName(exifData.ColorSpace) : '-',
        software: exifData.Software || exifData.ApplicationName || '-',
        timezone: exifData.TimeZone || exifData.TimeZoneOffset || '-',
        
        // 移除国家和城市字段
        coordinates: this.getCoordinatesFromExif(exifData),
        
        // 拍摄参数
        focalLength: exifData.FocalLength
          ? `${exifData.FocalLength} mm`
          : exifData.LensSpecification?.[0]
          ? `${exifData.LensSpecification[0]} mm`
          : '-',
        aperture: exifData.Aperture
          ? `f/${exifData.Aperture.toFixed(1)}`
          : exifData.FNumber
          ? `f/${exifData.FNumber.toFixed(1)}`
          : '-',
        shutter: exifData.ExposureTime
          ? this.formatExposureTime(exifData.ExposureTime)
          : exifData.ShutterSpeedValue
          ? this.formatExposureTime(1 / (2 ** exifData.ShutterSpeedValue))
          : '-',
        iso: exifData.ISO || exifData.ISOSpeedRatings || '-',
        
        // 设备信息
        camera: exifData.Make && exifData.Model
          ? `${exifData.Make.trim()} ${exifData.Model.trim()}`
          : exifData.Make || exifData.Model || '-',
        lens: exifData.LensModel || exifData.Lens || exifData.LensInfo || '-',
        lensFocalLength: exifData.LensInfo
          ? `${exifData.LensInfo[0]} mm`
          : exifData.LensSpecification?.[0]
          ? `${exifData.LensSpecification[0]} mm`
          : '-',
        focalLength35mm: exifData.FocalLengthIn35mmFormat || exifData.FocalLengthIn35mmFilm || '-',
        
        // 拍摄模式
        whiteBalance: exifData.WhiteBalance !== undefined ? this.getWhiteBalanceName(exifData.WhiteBalance) : '-',
        exposureProgram: exifData.ExposureProgram !== undefined ? this.getExposureProgramName(exifData.ExposureProgram) : '-',
        exposureMode: exifData.ExposureMode !== undefined ? this.getExposureModeName(exifData.ExposureMode) : '-',
        meteringMode: exifData.MeteringMode !== undefined ? this.getMeteringModeName(exifData.MeteringMode) : '-',
        flash: exifData.Flash !== undefined ? this.getFlashName(exifData.Flash) : '-',
        sceneCaptureType: exifData.SceneCaptureType !== undefined ? this.getSceneCaptureTypeName(exifData.SceneCaptureType) : '-',
        
        // 技术参数
        brightness: exifData.BrightnessValue
          ? `${exifData.BrightnessValue.toFixed(1)} EV`
          : exifData.Brightness
          ? `${exifData.Brightness.toFixed(1)} EV`
          : '-',
        sensorType: exifData.SensingMethod ? this.getSensorTypeName(exifData.SensingMethod) : '-',
        
        // 标记是否为模拟数据
        isMockData: exifData.isMockData || false
      };
    },

    // 获取基本EXIF数据（解析失败时使用）
    getBasicExifData(imageUrl) {
      // 确保imageUrl是字符串，避免undefined错误
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.warn('getBasicExifData: imageUrl无效', imageUrl);
        imageUrl = 'unknown.jpg';
      }
      
      return {
        fileName: imageUrl.split('/').pop() || 'unknown.jpg',
        fileSize: '-',
        width: '-',
        height: '-',
        pixelCount: '-',
        shootTime: '-',
        colorSpace: '-',
        software: '-',
        timezone: '-',
        coordinates: null,
        focalLength: '-',
        aperture: '-',
        shutter: '-',
        iso: '-',
        camera: '-',
        lens: '-',
        lensFocalLength: '-',
        focalLength35mm: '-',
        whiteBalance: '-',
        exposureProgram: '-',
        exposureMode: '-',
        meteringMode: '-',
        flash: '-',
        sceneCaptureType: '-',
        brightness: '-',
        sensorType: '-'
      };
    },

    // 获取传感器类型名称
    getSensorTypeName(value) {
      const types = {
        1: '单片彩色区域传感器',
        2: '两线彩色区域传感器',
        3: '三线彩色区域传感器',
        4: '镶嵌彩色区域传感器',
        5: '扫描彩色传感器',
        7: '单色区域传感器',
        8: '扫描单色传感器'
      }
      return types[value] || '彩色区域传感器'
    },

    // 为了兼容旧代码，保留parseExifData方法
    async parseExifData(imageUrl) {
      return this.getExifForUrl(imageUrl)
    },

    // 为照片添加EXIF数据（优化版，只解析一次）
    async enrichPhotoWithExifData(photo) {
      try {
        // 只从原图解析EXIF信息，避免重复下载
        const exifData = await this.getExifForUrl(photo.original || photo.originalUrl)
        
        // 确保返回有效的EXIF数据
        if (exifData && Object.keys(exifData).length > 0) {
          return exifData
        }
        
        // 如果解析失败，返回基本数据
        return this.getBasicExifData(photo.original || photo.originalUrl || photo.fileName || 'unknown.jpg')
      } catch (error) {
        // 出错时返回基本EXIF数据结构
        return this.getBasicExifData(photo.original || photo.originalUrl || photo.fileName || 'unknown.jpg')
      }
    },
    // 从EXIF数据中提取坐标信息
    getCoordinatesFromExif(exifData) {
      try {
        // 尝试多种GPS数据格式
        let lat, lng
        
        // 格式1: 直接的经纬度字段
        if (exifData.latitude && exifData.longitude) {
          lat = exifData.latitude
          lng = exifData.longitude
        }
        // 格式2: GPS数据结构
        else if (exifData.GPSLatitude && exifData.GPSLongitude && exifData.GPSLatitudeRef && exifData.GPSLongitudeRef) {
          // 解析度分秒格式
          const parseCoordinate = (coord, ref) => {
            const [degrees, minutes, seconds] = coord
            let value = degrees + (minutes / 60) + (seconds / 3600)
            return ref === 'S' || ref === 'W' ? -value : value
          }
          
          lat = parseCoordinate(exifData.GPSLatitude, exifData.GPSLatitudeRef)
          lng = parseCoordinate(exifData.GPSLongitude, exifData.GPSLongitudeRef)
        }
        // 格式3: 其他可能的GPS字段
        else if (exifData.GPSPosition) {
          const match = exifData.GPSPosition.match(/(\d+\.?\d*),\s*(\d+\.?\d*)/)
          if (match) {
            lat = parseFloat(match[1])
            lng = parseFloat(match[2])
          }
        }
        
        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          return {
            lat: lat,
            lng: lng,
            formattedLat: this.formatCoordinate(lat, 'lat'),
            formattedLng: this.formatCoordinate(lng, 'lng')
          }
        }
      } catch (error) {
        console.error('解析GPS坐标失败:', error)
      }
      
      return null
    },
    
    // 格式化日期时间
    formatDateTime(dateTime) {
      if (!dateTime) return '-'  
      const date = new Date(dateTime)
      if (isNaN(date.getTime())) return '-' 
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },
    
    // 格式化坐标
    formatCoordinate(value, type) {
      const direction = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W')
      const absValue = Math.abs(value)
      const degrees = Math.floor(absValue)
      const minutes = Math.floor((absValue - degrees) * 60)
      const seconds = ((absValue - degrees - minutes/60) * 3600).toFixed(2)
      return `${degrees}°${minutes}'${seconds}"${direction}`
    },
    
    // 格式化曝光时间
    formatExposureTime(seconds) {
      if (seconds >= 1) {
        return `${seconds.toFixed(1)} s`
      } else {
        return `1/${Math.round(1/seconds)}`
      }
    },
    
    // 获取色彩空间名称
    getColorSpaceName(value) {
      const colorSpaces = {
        1: 'sRGB',
        2: 'Adobe RGB',
        65535: 'Uncalibrated'
      }
      return colorSpaces[value] || 'RGB'
    },
    
    // 获取白平衡名称
    getWhiteBalanceName(value) {
      const whiteBalances = {
        0: '自动',
        1: '手动'
      }
      return whiteBalances[value] || '自动'
    },
    
    // 获取曝光程序名称
    getExposureProgramName(value) {
      const programs = {
        0: '未定义',
        1: '手动',
        2: '程序自动曝光',
        3: '光圈优先',
        4: '快门优先',
        5: '创意程序',
        6: '运动模式',
        7: '肖像模式',
        8: '风景模式'
      }
      return programs[value] || '未定义'
    },
    
    // 获取曝光模式名称
    getExposureModeName(value) {
      const modes = {
        0: '自动',
        1: '手动',
        2: '半手动'
      }
      return modes[value] || '自动'
    },
    
    // 获取测光模式名称
    getMeteringModeName(value) {
      const modes = {
        0: '未定义',
        1: '平均',
        2: '中央重点平均',
        3: '点测光',
        4: '多点',
        5: '评估',
        6: '局部',
        255: '其他'
      }
      return modes[value] || '矩阵测光'
    },
    
    // 获取闪光灯名称
    getFlashName(value) {
      if (value === undefined || value === null) return '未使用'
      const flashFired = (value & 1) ? '闪光' : '未闪光'
      const flashReturn = ((value >> 5) & 1) ? '，返回检测' : ''
      const flashMode = ((value >> 2) & 1) ? '，强制闪光' : ((value >> 3) & 1) ? '，禁止闪光' : '，自动'
      return flashMode + flashFired + flashReturn
    },
    
    // 获取场景捕获类型名称
    getSceneCaptureTypeName(value) {
      const types = {
        0: '标准',
        1: '风景',
        2: '肖像',
        3: '夜景肖像',
        4: '近距离'
      }
      return types[value] || '标准'
    },
    
    /**
     * 加载照片列表
     */
    async loadPhotos() {
      try {
        this.loading = true
        this.error = null
        
        // 从COS获取照片列表
        const photoList = await fetchPhotoList()
        
        // 直接使用API返回的数据格式，并为每张照片准备基础EXIF占位
        this.photos = photoList.map(photo => {
          this._ensurePhotoExifStub(photo)
          return photo
        })
        
        // 设置为没有更多照片（简化模式）
        this.hasMore = false
        
        // 如果有照片，设置第一张为当前照片
        if (this.photos.length > 0) {
          this.setCurrentPhoto(this.photos[0].id)
        }
        
      } catch (error) {
        console.error('加载S3照片失败:', error)
        this.error = '加载照片失败，请稍后重试'
      } finally {
        this.loading = false
      }
    },
    
    // 设置当前照片
    setCurrentPhoto(photo) {
      // 支持传入照片ID（数字）或照片对象
      let targetPhoto = null
      
      if (typeof photo === 'number' || typeof photo === 'string') {
        targetPhoto = this.photos.find(p => p.id === parseInt(photo))
        if (!targetPhoto) {
          console.warn(`未找到ID为 ${photo} 的照片`)
          return
        }
      } else if (photo && typeof photo === 'object') {
        const existingIndex = this.photos.findIndex(p => p.id === photo.id)
        targetPhoto = existingIndex !== -1 ? this.photos[existingIndex] : photo
      } else {
        console.warn('setCurrentPhoto: 无效的参数类型', photo)
        return
      }
      
      this._ensurePhotoExifStub(targetPhoto)
      this.currentPhoto = targetPhoto
    },
    
    /**
     * 获取照片详情
     * @param {number|string} id 照片ID
     */
    async getPhotoDetail(id) {
      try {
        this.detailLoading = true
        this.detailError = null
        
        // 尝试从本地缓存获取
        let photo = this.photos.find(p => p.id === parseInt(id))
        
        if (!photo) {
          // 如果本地没有，则从API获取
          photo = await fetchPhotoDetail(id)
        }
        
        // 先设置基本EXIF数据，确保UI能立即显示
        this._ensurePhotoExifStub(photo)
        
        // 设置当前照片（先显示照片）
        this.currentPhoto = photo
        
        // 异步加载完整EXIF数据，不阻塞UI
        // 使用requestIdleCallback或setTimeout延迟加载
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(async () => {
            await this._loadExifDataAsync(photo)
          }, { timeout: 2000 })
        } else {
          // 降级到setTimeout
          setTimeout(async () => {
            await this._loadExifDataAsync(photo)
          }, 300)
        }
        
      } catch (error) {
        console.error(`获取照片${id}详情失败:`, error)
        this.detailError = '获取照片详情失败'
        this.currentPhoto = null
      } finally {
        this.detailLoading = false
      }
    },
    
    // 异步加载EXIF数据（内部方法）
    async _loadExifDataAsync(photo) {
      // 检查是否还需要加载（可能用户已经切换了照片）
      if (!this.currentPhoto || this.currentPhoto.id !== photo.id) {
        return
      }
      
      // 如果已经有完整的EXIF数据，跳过
      if (photo.exif && photo.exif.camera !== '-' && photo.exif.width !== '-') {
        return
      }
      
      try {
        const exifData = await this.enrichPhotoWithExifData(photo)
        // 再次检查当前照片是否还是这个
        if (this.currentPhoto && this.currentPhoto.id === photo.id) {
          this.currentPhoto.exif = exifData
        }
      } catch (error) {
        // 静默失败，保持基本EXIF数据
      }
    },
    
    /**
     * 重置状态
     */
    reset() {
      this.photos = []
      this.currentPhoto = null
      this.loading = false
      this.error = null
      this.page = 1
      this.hasMore = true
    }
  }
})