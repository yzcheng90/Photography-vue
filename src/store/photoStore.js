import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchPhotoList, fetchPhotoDetail, generatePublicUrl } from '../services/photoApi'

export const usePhotoStore = defineStore('photo', {
  state: () => ({
    photos: [],
    currentPhoto: null,
    loading: false,
    error: null,
    page: 1,
    pageSize: 20,
    hasMore: true
  }),
  
  getters: {
    getPhotoById: (state) => (id) => {
      return state.photos.find(photo => photo.id === parseInt(id)) || null
    }
  },
  
  actions: {
    // 获取文件大小
    async getFileSize(url) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          cache: 'no-store'
        })
        
        if (response.ok) {
          const contentLength = response.headers.get('content-length')
          if (contentLength) {
            const sizeInBytes = parseInt(contentLength)
            if (sizeInBytes < 1024) {
              return `${sizeInBytes} B`
            } else if (sizeInBytes < 1024 * 1024) {
              return `${(sizeInBytes / 1024).toFixed(2)} KB`
            } else {
              return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
            }
          }
        }
      } catch (error) {
        console.error(`获取文件大小失败 (${url}):`, error)
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
    
    // 获取图片EXIF信息
    async getExifForUrl(imageUrl) {
      try {
        const format = this.getImageFormat(imageUrl)
        console.log(`尝试解析图片EXIF (格式: ${format}): ${imageUrl}`)
        
        // 根据不同格式采用不同的解析策略
        if (format === 'webp') {
          // WebP格式特殊处理
          console.log('WebP格式检测到，使用简化的解析策略')
          // 对于WebP，我们只获取基本信息（尺寸、文件大小），因为EXIF支持有限
          try {
            // 尝试获取尺寸
            let dimensions = null
            try {
              dimensions = await this.getImageDimensions(imageUrl)
            } catch (e) {
              console.error('获取WebP图片尺寸失败:', e)
            }
            
            // 尝试获取文件大小
            let fileSize = '-'  
            try {
              fileSize = await this.getFileSize(imageUrl)
            } catch (e) {
              console.error('获取WebP文件大小失败:', e)
            }
            
            // 返回基本信息，标记为WebP格式
            const basicData = this.getBasicExifData(imageUrl)
            return {
              ...basicData,
              fileSize: fileSize || '-',
              width: dimensions?.width || '-',
              height: dimensions?.height || '-',
              pixelCount: (dimensions?.width && dimensions?.height)
                ? `${((dimensions.width * dimensions.height) / 1000000).toFixed(2)} MP`
                : '-',
              format: 'webp'
            }
          } catch (error) {
            console.error('WebP基本信息获取失败:', error)
            return this.getBasicExifData(imageUrl)
          }
        } else if (['jpeg', 'tiff'].includes(format)) {
          // 对于JPEG和TIFF，尝试使用exifr解析完整EXIF数据
          try {
            // 使用exifr解析JPEG/TIFF的EXIF数据
            const exifData = await exifr.parse(imageUrl, {
              xmp: true,
              icc: true,
              tiff: true,
              ifd1: true,
              iptc: true,
              jfif: true,
              exif: true,
              gps: true,
              translateValues: true,
              mergeOutput: true,
              chunked: true,
              maxBufferSize: 10 * 1024 * 1024,
              timeout: 5000
            })
            
            // 如果解析成功且有有效数据，使用解析的数据
            if (exifData && Object.keys(exifData).length > 0) {
              console.log(`成功解析${format.toUpperCase()}的EXIF数据`)
              // 尝试获取图片尺寸
              const dimensions = await this.getImageDimensions(imageUrl)
              // 获取文件大小
              const fileSize = await this.getFileSize(imageUrl)
              
              return this.formatExifData(exifData, dimensions, fileSize, imageUrl)
            }
          } catch (exifError) {
            console.warn(`${format.toUpperCase()} EXIF解析失败: ${exifError.message}`)
          }
        } else {
          // 对于其他格式（如PNG），只获取基本信息
          console.log(`${format.toUpperCase()}格式，可能不包含完整EXIF信息，使用基本解析策略`)
        }
        
        console.log('使用基本EXIF数据')
        return this.getBasicExifData(imageUrl)
      } catch (error) {
        console.error(`获取EXIF信息过程中出错 (${imageUrl}):`, error)
        
        // 返回基本信息
        return this.getBasicExifData(imageUrl)
      }
    },
    
    // 获取图片尺寸
    async getImageDimensions(imageUrl) {
      try {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ width: img.width, height: img.height })
          img.onerror = () => reject(new Error('无法获取图片尺寸'))
          img.src = imageUrl
          img.crossOrigin = 'anonymous'
        })
      } catch (error) {
        console.error('获取图片尺寸失败:', error)
        return { width: 1920, height: 1080 } // 默认值作为后备
      }
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
      return {
        fileName: imageUrl.split('/').pop(),
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

    // 为照片添加EXIF数据（原图+缩略图双重解析策略）
    async enrichPhotoWithExifData(photo) {
      try {
        // 首先尝试从原图解析EXIF信息
        let exifData = await this.getExifForUrl(photo.original)
        
        // 如果原图解析失败或信息不完整，尝试从缩略图解析
        const hasBasicInfo = exifData && 
          (exifData.width !== '-' || 
           exifData.height !== '-' || 
           exifData.camera !== '-')
        
        if (!hasBasicInfo && photo.thumbnail !== photo.original) {
          console.log(`原图EXIF信息不完整，尝试从缩略图解析: ${photo.thumbnail}`)
          const thumbnailExif = await this.getExifForUrl(photo.thumbnail)
          
          // 合并缩略图的信息到原图数据中
          if (thumbnailExif) {
            exifData = {
              ...exifData,
              ...thumbnailExif,
              fileName: photo.original.split('/').pop(), // 保留原图文件名
              fileSize: exifData?.fileSize !== '-' ? exifData.fileSize : thumbnailExif?.fileSize // 优先使用原图文件大小
            }
          }
        }
        
        // 确保返回有效的EXIF数据，即使所有解析都失败
        if (!exifData || Object.keys(exifData).length === 0) {
          console.log(`所有EXIF解析都失败，使用基本数据结构`)
          // 获取图片尺寸信息
          let dimensions = null
          try {
            dimensions = await this.getImageDimensions(photo.original)
          } catch (e) {
            console.error('获取图片尺寸失败:', e)
          }
          
          // 获取文件大小信息
          let fileSize = '-'  
          try {
            fileSize = await this.getFileSize(photo.original)
          } catch (e) {
            console.error('获取文件大小失败:', e)
          }
          
          // 返回基本EXIF数据结构
          return this.formatExifData(null, dimensions, fileSize, photo.original)
        }
        
        return exifData
      } catch (error) {
        console.error(`解析EXIF数据时出错:`, error)
        // 出错时返回基本EXIF数据结构
        return this.getBasicExifData(photo.original)
      }
    },

    // 获取图片尺寸信息
    async getImageDimensions(imageUrl) {
      return new Promise((resolve) => {
        try {
          const img = new Image()
          img.crossOrigin = 'Anonymous' // 尝试解决CORS问题
          
          img.onload = () => {
            console.log(`成功获取图片尺寸: ${imageUrl}, ${img.width}x${img.height}`)
            resolve({
              width: img.width,
              height: img.height
            })
          }
          
          img.onerror = () => {
            console.error(`无法加载图片获取尺寸: ${imageUrl}`)
            // 出错时返回合理的默认值
            resolve({ width: 1200, height: 800 })
          }
          
          img.src = imageUrl + '?' + new Date().getTime() // 添加时间戳避免缓存
        } catch (error) {
          console.error('获取图片尺寸失败:', error)
          // 捕获异常时返回默认值
          resolve({ width: 1200, height: 800 })
        }
      })
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
        
        // 从S3获取照片列表
        const photoList = await fetchPhotoList()
        
        console.log(`Store收到${photoList.length}张照片`)
        
        // 直接使用API返回的数据格式
        this.photos = photoList
        
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
      // 确保currentPhoto和photos数组中的照片对象是同一个引用
      // 首先检查photos数组中是否已存在该照片
      const existingIndex = this.photos.findIndex(p => p.id === photo.id)
      
      if (existingIndex !== -1) {
        // 如果存在，使用数组中的引用，确保数据同步
        this.currentPhoto = this.photos[existingIndex]
      } else {
        // 如果不存在，直接使用传入的照片对象
        this.currentPhoto = photo
        // 并确保currentPhoto对象有exif属性，使用基本数据结构
        if (!this.currentPhoto.exif) {
          this.currentPhoto.exif = this.getBasicExifData(photo.original)
        }
    }
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
        
        // 简化版本：直接使用照片数据
        this.currentPhoto = photo
        
      } catch (error) {
        console.error(`获取照片${id}详情失败:`, error)
        this.detailError = '获取照片详情失败'
        this.currentPhoto = null
      } finally {
        this.detailLoading = false
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