// 照片API服务，使用腾讯云COS SDK连接COS获取照片

// 导入腾讯云COS SDK
import COS from 'cos-js-sdk-v5';

/* ====== COS 配置 ====== */
const REGION = 'ap-guangzhou'; // 用户提供的区域
const BUCKET = 'photos-1256173416'; // 用户提供的桶名
const PHOTO_DIR = '20251115'; // 使用根目录获取照片，避免NoSuchKey错误

// 用户提供的实际访问密钥
const SECRET_ID = 'AKIDVwCF8AKIDVwCF8oHWXxxxxxaoIZdXWSF3sY2IZdXWSF3sY2'; // 用户提供的SecretId
const SECRET_KEY = 'LPabWL2wfAAKIDVwCF8oHWXxxxxxaoIZdXWSF3sY2Dl5B4'; // 用户提供的SecretKey
/* ===================== */

// 创建COS实例
const cos = new COS({
  SecretId: SECRET_ID,
  SecretKey: SECRET_KEY,
  Domain: `${BUCKET}.cos.${REGION}.myqcloud.com` // 使用桶的域名
});

// 缓存已获取的照片列表
let cachedPhotos = [];
let isCacheValid = false;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取照片列表
 * @returns {Promise<Array>} 照片数据列表
 */
async function fetchPhotoList() {
  // 简化的错误处理函数
  const handleError = (message, error) => {
    console.error(`[COS] ${message}:`, error?.message || error);
  };
  
  try {
    // 如果缓存有效，直接返回缓存数据
    if (isCacheValid && cachedPhotos.length > 0) {
      return [...cachedPhotos];
    }
    
    return new Promise((resolve, reject) => {
      // 构建请求参数
      const params = {
        Bucket: BUCKET,
        Region: REGION,
        Delimiter: '/',
        MaxKeys: 1000
      };
      
      // 只有当PHOTO_DIR不为空时才设置Prefix
      if (PHOTO_DIR && PHOTO_DIR.trim() !== '') {
        params.Prefix = PHOTO_DIR.endsWith('/') ? PHOTO_DIR : PHOTO_DIR + '/';
      }
      
      cos.getBucket(params, function(err, data) {
        if (err) {
          handleError('获取COS桶内容失败', err);
          
          // 对于某些错误，返回空数组而不是抛出错误
          if (err.code === 'NoSuchBucket' || err.code === 'AccessDenied' || err.statusCode === 403) {
            resolve([]);
            return;
          }
          
          reject(err);
          return;
        }
          
        // 过滤并处理图片文件
        const photos = (data.Contents || []).filter(o => {
          return /\.(jpg|jpeg|png|gif|webp)$/i.test(o.Key);
        }).map((o, index) => {
          // 生成原图URL和缩略图URL
          const originalUrl = generatePublicUrl(o.Key);
          const thumbnailUrl = generateThumbnailUrl(o.Key, 500, 85); // 500px宽度，85%质量
          return {
            id: index + 1,
            fileName: o.Key.split('/').pop(),
            thumbnail: thumbnailUrl,  // 列表页使用缩略图
            original: originalUrl,     // 详情页使用原图
            thumbnailUrl: thumbnailUrl,
            originalUrl: originalUrl,
            key: o.Key,
            size: o.Size,
            lastModified: o.LastModified
          };
        });
          
        // 如果指定目录没有照片，尝试根目录（仅当PHOTO_DIR不为空时）
        if (photos.length === 0 && PHOTO_DIR && PHOTO_DIR.trim() !== '') {
          const rootParams = {
            Bucket: BUCKET,
            Region: REGION,
            Delimiter: '/',
            MaxKeys: 1000
          };
            
          cos.getBucket(rootParams, function(rootErr, rootData) {
            if (rootErr) {
              handleError('获取根目录内容失败', rootErr);
              resolve([]);
              return;
            }
              
            const rootPhotos = (rootData.Contents || []).filter(o =>
              /\.(jpg|jpeg|png|gif|webp)$/i.test(o.Key)
            ).map((o, index) => {
              // 生成原图URL和缩略图URL
              const originalUrl = generatePublicUrl(o.Key);
              const thumbnailUrl = generateThumbnailUrl(o.Key, 500, 85);
              return {
                id: index + 1,
                fileName: o.Key.split('/').pop(),
                thumbnail: thumbnailUrl,  // 列表页使用缩略图
                original: originalUrl,     // 详情页使用原图
                thumbnailUrl: thumbnailUrl,
                originalUrl: originalUrl,
                key: o.Key,
                size: o.Size,
                lastModified: o.LastModified
              };
            });
              
            cachedPhotos = rootPhotos;
            isCacheValid = true;
            resolve([...rootPhotos]);
          });
        } else {
          cachedPhotos = photos;
          isCacheValid = true;
          resolve([...photos]);
        }
      });
    });
  } catch (error) {
    handleError('获取照片列表时发生未预期的错误', error);
    return [];
  }
}

/**
 * 获取照片详情
 * @param {string|number} id 照片ID
 * @returns {Promise<Object>} 照片详情
 * @throws {Error} 当照片不存在时抛出错误
 */
async function fetchPhotoDetail(id) {
  try {
    // 如果缓存中没有数据，先获取照片列表
    if (!isCacheValid || cachedPhotos.length === 0) {
      await fetchPhotoList();
    }
    
    const photo = cachedPhotos.find(p => p.id === parseInt(id));
    if (!photo) {
      throw new Error(`照片ID ${id} 不存在`);
    }
    
    return { ...photo }; // 返回副本以避免外部修改
  } catch (error) {
    console.error('获取照片详情失败:', error);
    throw error;
  }
}

/**
 * 生成照片原图公开访问URL
 * @param {string} path 照片路径
 * @returns {string} 原图URL
 */
const generatePublicUrl = (path) => {
  // 确保路径不以斜杠开头，避免重复的斜杠
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
  // 使用腾讯云COS的CDN加速域名或桶域名
  // 格式：https://photos-1256173416.cos.ap-guangzhou.myqcloud.com/path
  return `https://${BUCKET}.cos.${REGION}.myqcloud.com/${normalizedPath}`;
};

/**
 * 生成照片缩略图URL（使用腾讯云COS图片处理）
 * @param {string} path 照片路径
 * @param {number} width 缩略图宽度，默认500px
 * @param {number} quality 图片质量，默认85
 * @returns {string} 缩略图URL
 */
const generateThumbnailUrl = (path, width = 500, quality = 85) => {
  // 确保路径不以斜杠开头
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
  // 使用腾讯云COS的图片处理功能生成缩略图
  // imageMogr2/thumbnail/!50p 表示缩放到原图的50%
  // imageMogr2/thumbnail/500x 表示宽度500px，高度按比例
  // rquality/85 表示质量85%
  // 格式：https://bucket.cos.region.myqcloud.com/path?imageMogr2/thumbnail/500x/rquality/85
  const baseUrl = `https://${BUCKET}.cos.${REGION}.myqcloud.com/${normalizedPath}`;
  return `${baseUrl}?imageMogr2/thumbnail/${width}x/rquality/${quality}`;
};

/**
 * 清除照片缓存
 */
export function clearPhotoCache() {
  cachedPhotos = [];
  isCacheValid = false;
  console.log('照片缓存已清除');
}

// 导出API函数
export {
  fetchPhotoList,
  fetchPhotoDetail,
  generatePublicUrl,
  generateThumbnailUrl
};

export default {
  fetchPhotoList,
  fetchPhotoDetail,
  generatePublicUrl,
  generateThumbnailUrl
};