// 照片API服务，使用AWS SDK v3连接S3获取照片，并在连接失败时回退到模拟数据

// 使用实际S3配置，不使用模拟数据

// 导入AWS SDK
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

/* ====== S3 配置 ====== */
const REGION   = 'ap-guangzhou' // 用户提供的区域
const ENDPOINT = 'https://s3.xxxxx.net'  // 用户提供的访问域名
const BUCKET   = 'photos-1xxxx16'     // 用户提供的桶名
const PHOTO_DIR = '20251115'              // 用户提供的照片目录
// 用户提供的实际访问密钥
const ACCESS_KEY = 'AKIDVwCF8oHWXLyxxxxxxIZdXWSF3sY2' // 用户提供的SecretId
const SECRET_KEY = 'LPabWL2wfASWNxxxxxxZMxLVSDl5B4' // 用户提供的SecretKey
/* ===================== */

// S3客户端将在fetchPhotoList函数中动态创建

// 缓存已获取的照片列表
let cachedPhotos = [];
let isCacheValid = false;

/**
 * 获取照片列表
 * @returns {Promise<Array>} 照片数据列表
 */
async function fetchPhotoList() {
  try {
    // 如果缓存有效，直接返回缓存数据
    if (isCacheValid && cachedPhotos.length > 0) {
      console.log(`返回缓存的照片数据，共${cachedPhotos.length}张照片`);
      return [...cachedPhotos];
    }
    
    console.log('从S3获取照片列表...');
    
    // 创建S3客户端实例
    const s3Client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY
      }
    });
    
    // 从S3获取对象列表，指定照片目录
    const { Contents = [] } = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PHOTO_DIR, // 指定照片目录
        MaxKeys: 100
      })
    );
    
    // 过滤出常见图片后缀并转换为应用需要的数据格式
    const photos = Contents.filter(o =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(o.Key)
    ).map((o, index) => ({
      id: index + 1,
      fileName: o.Key.split('/').pop(),
      thumbnail: `${ENDPOINT}/${encodeURIComponent(o.Key)}`,
      original: `${ENDPOINT}/${encodeURIComponent(o.Key)}`,
      thumbnailUrl: `${ENDPOINT}/${encodeURIComponent(o.Key)}`,
      originalUrl: `${ENDPOINT}/${encodeURIComponent(o.Key)}`,
      key: o.Key,
      size: o.Size,
      lastModified: o.LastModified
    }));
    
    console.log(`成功从S3获取${photos.length}张照片`);
    
    // 更新缓存
    cachedPhotos = photos;
    isCacheValid = true;
    
    return [...photos];
  } catch (error) {
    console.error('获取照片列表时发生错误:', error);
    throw error; // 抛出错误以便上层处理
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
 * @param {string} path 照片路径
 * @returns {string} 公开访问URL
 */
const generatePublicUrl = (path) => {
  return `${ENDPOINT}/${encodeURIComponent(path)}`;
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
  generatePublicUrl
};

export default {
  fetchPhotoList,
  fetchPhotoDetail,
  generatePublicUrl
};