// 照片API服务，使用AWS SDK v3连接S3获取照片，并在连接失败时回退到模拟数据

// 使用实际S3配置，不使用模拟数据

// 导入AWS SDK
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

/* ====== COS (S3 兼容) 配置 ====== */
const REGION   = 'ap-guangzhou'
const BUCKET   = 'photos-1256173416'
const BUCKET_DOMAIN = `s3.lifee.net`
const ENDPOINT = `https://${BUCKET_DOMAIN}`
const PHOTO_DIR = ''
const MAX_KEYS = 1000
// 用户提供的实际访问密钥
const ACCESS_KEY = 'AKIDVwCF8oHWXxxxxxaoIZdXWSF3sY2'
const SECRET_KEY = 'LPabWL2wxxxxxxxZMxLVSDl5B4'
/* ===================== */

// 缓存已获取的照片列表
let cachedPhotos = [];
let isCacheValid = false;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 创建并返回配置好的S3客户端实例
 * 封装公共的S3客户端配置，避免重复代码
 * @param {Object} options 额外配置选项
 * @returns {S3Client} 配置好的S3客户端实例
 */
function getS3Client(options = {}) {
  return new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: false, // 使用虚拟主机样式 URL，匹配桶域名
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY
    },
    maxAttempts: 3,
    ...options
  });
}

/**
 * 列出指定路径的S3对象
 * 封装公共的列表操作逻辑
 * @param {S3Client} client S3客户端实例
 * @param {Object} options 列表操作选项
 * @returns {Promise<Object>} S3列表响应
 */
async function listS3Objects(client, options = {}) {
  const params = {
    Bucket: BUCKET,
    MaxKeys: MAX_KEYS,
    ...options
  };
  
  // 添加详细的请求日志
  console.log('🔍 S3请求详情:', {
    endpoint: client.config.endpoint,
    region: client.config.region,
    forcePathStyle: client.config.forcePathStyle,
    bucket: params.Bucket,
    prefix: params.Prefix || '(无)',
    delimiter: params.Delimiter || '(无)',
    maxKeys: params.MaxKeys || '(默认)'
  });
  
  try {
    const response = await client.send(new ListObjectsV2Command(params));
    console.log('✅ S3响应成功:', {
      对象数量: response.Contents?.length || 0,
      公共前缀数量: response.CommonPrefixes?.length || 0,
      是否截断: response.IsTruncated,
      下一个标记: response.NextContinuationToken || '(无)'
    });
    
    // 如果有对象，打印前几个对象的详细信息
    if (response.Contents && response.Contents.length > 0) {
      console.log('📁 前几个对象详情:');
      response.Contents.slice(0, 3).forEach((obj, index) => {
        console.log(`  ${index + 1}. 键: ${obj.Key}, 大小: ${obj.Size} 字节, 修改时间: ${obj.LastModified}`);
      });
    }
    
    return response;
  } catch (error) {
    console.error('❌ S3请求失败:', {
      错误名称: error.name,
      错误代码: error.Code || error.code,
      错误消息: error.message,
      请求ID: error.RequestId,
      状态码: error.$metadata?.httpStatusCode,
      错误详情: error.details
    });
    throw error;
  }
}

function buildPhotosFromS3Objects(contents = []) {
  return contents
    .filter(obj => /\.(jpg|jpeg|png|gif|webp)$/i.test(obj.Key))
    .map((obj, index) => {
      const originalUrl = generatePublicUrl(obj.Key);
      const thumbnailUrl = generateThumbnailUrl(obj.Key);
      return {
        id: index + 1,
        fileName: obj.Key.split('/').pop(),
        thumbnail: thumbnailUrl,
        original: originalUrl,
        thumbnailUrl,
        originalUrl,
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified
      };
    });
}



/**
 * 获取照片列表
 * @returns {Promise<Array>} 照片数据列表
 */
async function fetchPhotoList() {
  try {
    if (isCacheValid && cachedPhotos.length > 0) {
      return [...cachedPhotos];
    }

    const s3Client = getS3Client();
    const prefix = PHOTO_DIR && PHOTO_DIR.trim() !== ''
      ? (PHOTO_DIR.endsWith('/') ? PHOTO_DIR : `${PHOTO_DIR}/`)
      : undefined;

    // 先列出指定目录（如有）
    let contents = await listS3Objects(s3Client, {
      Prefix: prefix,
      MaxKeys: MAX_KEYS,
      Delimiter: '/'
    });

    let photos = buildPhotosFromS3Objects(contents.Contents || []);

    // 如果指定目录没有照片，尝试根目录
    if (photos.length === 0 && prefix) {
      const rootContents = await listS3Objects(s3Client, {
        MaxKeys: MAX_KEYS,
        Delimiter: '/'
      });
      photos = buildPhotosFromS3Objects(rootContents.Contents || []);
    }

    cachedPhotos = photos;
    isCacheValid = true;
    return [...photos];
  } catch (error) {
    console.error('[S3] 获取照片列表失败:', error?.message || error);
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
 * 生成照片公开访问URL
 * 针对桶特定的endpoint优化的URL生成逻辑
 * @param {string} path 照片路径
 * @returns {string} 公开访问URL
 */
const generatePublicUrl = (path) => {
  // 确保路径不以斜杠开头，避免重复的斜杠
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
return `https://${BUCKET_DOMAIN}/${normalizedPath}`;
};

/**
 * 生成缩略图URL（使用COS图片处理）
 * @param {string} path
 * @param {number} width
 * @param {number} quality
 * @returns {string}
 */
const generateThumbnailUrl = (path, width = 500, quality = 85) => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `https://${BUCKET_DOMAIN}/${normalizedPath}?imageMogr2/thumbnail/${width}x/rquality/${quality}`;
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