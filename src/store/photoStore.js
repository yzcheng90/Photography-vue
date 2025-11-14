import { defineStore } from 'pinia'

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
    // 加载照片列表
    async loadPhotos() {
      this.loading = true
      this.error = null
      
      try {
        // 在实际项目中，这里应该调用真实的API
        // const response = await axios.get('/api/photos', { params: { page: this.page, pageSize: this.pageSize } })
        // const newPhotos = response.data.photos
        
        // 使用模拟数据
        const mockPhotos = Array.from({ length: 50 }, (_, index) => ({
          id: index + 1,
          title: `摄影作品 ${index + 1}`,
          date: `2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
          thumbnail: `https://picsum.photos/600/400?random=${index}`,
          original: `https://picsum.photos/1920/1080?random=${index}`,
          exif: {
            // 基本信息
            fileName: `photos/IMG_${1500 + index}.jpeg`,
            fileSize: `${(Math.random() * 5 + 1).toFixed(2)} MB`,
            width: 5712,
            height: 4284,
            pixelCount: '24.47 MP',
            shootTime: `2024/${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
            colorSpace: 'RGB',
            software: '17.4.1',
            timezone: 'UTC+8',
            country: '中国',
            city: '青山湖区',
            
            // 坐标信息
            coordinates: { 
              lat: 28.6786, 
              lng: 115.9866,
              formattedLat: '28°40\'42.99"N',
              formattedLng: '115°59\'11.88"E'
            },
            
            // 拍摄参数
            focalLength: '24 mm',
            aperture: 'f/1.8',
            shutter: '1/100',
            iso: 160,
            
            // 设备信息
            camera: 'Apple iPhone 15 Pro Max',
            lens: 'Apple iPhone 15 Pro Max back triple camera 6.765mm f/1.78',
            lensFocalLength: '6.8 mm',
            focalLength35mm: '24 mm',
            
            // 拍摄模式
            whiteBalance: '自动',
            exposureProgram: '程序自动曝光',
            exposureMode: '自动',
            meteringMode: '矩阵测光',
            flash: '关闭，未闪光',
            sceneCaptureType: '标准',
            
            // 技术参数
            brightness: '3.4 EV',
            sensorType: '单片彩色区域传感器'
          }
        }))
        
        const startIndex = (this.page - 1) * this.pageSize
        const endIndex = startIndex + this.pageSize
        const newPhotos = mockPhotos.slice(startIndex, endIndex)
        
        this.photos.push(...newPhotos)
        
        // 检查是否还有更多数据
        if (newPhotos.length < this.pageSize) {
          this.hasMore = false
        }
        
        this.page++
      } catch (error) {
        this.error = '加载照片失败，请稍后重试'
        console.error('加载照片失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 设置当前照片
    setCurrentPhoto(photo) {
      this.currentPhoto = photo
    },
    
    // 获取照片详情
    async getPhotoDetail(id) {
      // 尝试从已加载的照片中查找
      let photo = this.getPhotoById(id)
      
      if (!photo) {
        // 如果没找到，模拟加载
        this.loading = true
        this.error = null
        
        try {
          // 模拟API调用延迟
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // 创建模拟数据
          photo = {
            id: parseInt(id),
            title: `摄影作品 ${id}`,
            date: `2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
            thumbnail: `https://picsum.photos/600/400?random=${id}`,
            original: `https://picsum.photos/1920/1080?random=${id}`,
            exif: {
              // 基本信息
              fileName: `photos/IMG_${1500 + parseInt(id)}.jpeg`,
              fileSize: '3.89 MB',
              width: 5712,
              height: 4284,
              pixelCount: '24.47 MP',
              shootTime: '2024/07/02 19:22',
              colorSpace: 'RGB',
              software: '17.4.1',
              timezone: 'UTC+8',
              country: '中国',
              city: '青山湖区',
              
              // 坐标信息
              coordinates: { 
                lat: 28.6786, 
                lng: 115.9866,
                formattedLat: '28°40\'42.99"N',
                formattedLng: '115°59\'11.88"E'
              },
              
              // 拍摄参数
              focalLength: '24 mm',
              aperture: 'f/1.8',
              shutter: '1/100',
              iso: 160,
              
              // 设备信息
              camera: 'Apple iPhone 15 Pro Max',
              lens: 'Apple iPhone 15 Pro Max back triple camera 6.765mm f/1.78',
              lensFocalLength: '6.8 mm',
              focalLength35mm: '24 mm',
              
              // 拍摄模式
              whiteBalance: '自动',
              exposureProgram: '程序自动曝光',
              exposureMode: '自动',
              meteringMode: '矩阵测光',
              flash: '关闭，未闪光',
              sceneCaptureType: '标准',
              
              // 技术参数
              brightness: '3.4 EV',
              sensorType: '单片彩色区域传感器'
            }
          }
          
          // 添加到照片列表
          if (!this.photos.some(p => p.id === photo.id)) {
            this.photos.push(photo)
          }
        } catch (error) {
          this.error = '加载照片详情失败'
          console.error('加载照片详情失败:', error)
        } finally {
          this.loading = false
        }
      }
      
      this.currentPhoto = photo
      return photo
    },
    
    // 重置状态
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