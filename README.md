# Photography-vue

## 项目介绍

Photography-vue 是一个基于 Vue 3 开发的个人摄影作品展示网站。该项目旨在为摄影师提供一个优雅、现代的平台，用于展示和分享高质量的摄影作品。网站采用瀑布流布局展示照片，支持照片详情查看、EXIF信息展示、响应式设计等功能，为用户提供流畅的浏览体验。

## 项目效果
以下是项目的效果截图：
![首页效果](https://raw.githubusercontent.com/yzcheng90/Photography-vue/main/pic/ScreenShot_2025-11-14_162147_529.png)
![详情页效果](https://raw.githubusercontent.com/yzcheng90/Photography-vue/main/pic/ScreenShot_2025-11-14_162257_469.png)

## 技术栈

- **前端框架**: Vue 3.5+<br>
- **状态管理**: Pinia 2.3+<br>
- **路由管理**: Vue Router 4.6+<br>
- **UI组件库**: Element Plus 2.8+<br>
- **构建工具**: Vite 6.0+<br>
- **HTTP客户端**: Axios 1.7+<br>
- **3D渲染**: Three.js 0.172+ (可选功能)<br>
- **样式**: CSS3 自定义变量与响应式设计<br>

## 项目架构

项目采用典型的 Vue 3 单页应用架构，主要包含以下模块：

### 目录结构

```
src/
├── components/         # 可复用组件
│   ├── PhotoGalleryNav.vue  # 照片导航组件
│   └── WaterfallGallery.vue # 瀑布流展示组件
├── views/              # 页面视图
│   ├── Home.vue        # 首页
│   └── PhotoDetail.vue # 照片详情页
├── router/             # 路由配置
│   └── index.js
├── store/              # 状态管理
│   └── photoStore.js
├── main.js             # 应用入口
└── App.vue             # 根组件
```

### 核心模块

1. **路由管理**
   - 使用 Vue Router 实现页面路由，支持首页和照片详情页的导航
   - 采用懒加载方式优化性能

2. **状态管理**
   - 使用 Pinia 管理全局状态，包括照片列表、当前选中照片、加载状态等
   - 提供异步操作处理照片数据的加载和管理

3. **UI组件**
   - WaterfallGallery: 实现瀑布流布局的照片展示组件
   - PhotoGalleryNav: 提供照片导航和操作功能

4. **页面视图**
   - Home: 展示摄影师信息和照片瀑布流
   - PhotoDetail: 照片详情页，支持图片缩放、EXIF信息查看等功能

## 主要功能

1. **照片瀑布流展示**
   - 响应式瀑布流布局，自适应不同屏幕尺寸
   - 图片懒加载和骨架屏加载效果
   - 点击图片查看详情

2. **照片详情查看**
   - 高清大图展示
   - 图片缩放、拖动和重置功能
   - 前后照片导航
   - EXIF信息面板（可显示/隐藏）
   - 沉浸式浏览体验，支持全屏查看

3. **摄影师个人信息展示**
   - 个人简介和统计数据
   - 扁平化设计的个人信息区域

4. **响应式设计**
   - 适配桌面端、平板和移动设备
   - 移动端优化的交互体验

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 自定义和扩展

### 添加新照片

在实际项目中，您需要将 `photoStore.js` 中的模拟数据替换为真实的 API 调用，以加载您自己的照片数据。

### 自定义主题

可以通过修改 `App.vue` 中的 CSS 变量来自定义网站主题颜色：

```css
:root {
  --primary-color: #00bcd4;
  --secondary-color: #6c757d;
  --bg-primary: #343535;
  --bg-secondary: #3a3a3a;
  --bg-tertiary: #404040;
  --text-primary: #ffffff;
  --text-secondary: #d0d0d0;
  --border-color: #505050;
}
```

## 开源协议

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 贡献指南

欢迎提交 Issues 和 Pull Requests 来改进本项目。在提交代码前，请确保：

1. 代码风格与项目保持一致
2. 添加必要的注释
3. 测试功能是否正常工作

## 联系方式

如有任何问题或建议，请通过以下方式联系项目维护者：

- 邮箱: [作者邮箱](mailto:yzcheng90@qq.com)
- GitHub: [https://github.com/yzcheng90/Photography-vue](https://github.com/yzcheng90/Photography-vue)
