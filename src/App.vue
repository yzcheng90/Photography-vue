<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* 全局样式重置和基础设置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 深色主题全局变量 */
:root {
  --primary-color: #00bcd4;
  --secondary-color: #6c757d;
  --bg-primary: #343535;
  --bg-secondary: #3a3a3a;
  --bg-tertiary: #404040;
  --text-primary: #ffffff;
  --text-secondary: #d0d0d0;
  --border-color: #505050;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.6);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.7);
  --transition: all 0.3s ease;
  --border-radius: 8px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.app {
  width: 100%;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

/* 全局过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 加载动画 */
.loading-spinner {
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 响应式容器 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 通用按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  color: var(--text-primary) !important;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white !important;
  border: 1px solid var(--primary-color);
}

.btn-primary:hover {
  background-color: #00acc1;
  border-color: #00acc1;
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

/* 响应式图片 */
.responsive-img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* 卡片样式 */
.card {
  background-color: var(--bg-secondary);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  transition: box-shadow 0.3s ease;
  border: 1px solid var(--border-color);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

/* 响应式网格 */
.grid {
  display: grid;
  gap: 20px;
}

/* 响应式断点 */
@media (max-width: 1200px) {
  .container {
    max-width: 1000px;
  }
}

@media (max-width: 992px) {
  .container {
    max-width: 768px;
  }
}

@media (max-width: 768px) {
  .container {
    max-width: 100%;
    padding: 0 15px;
  }
  
  .card {
    padding: 15px;
  }
}

@media (max-width: 480px) {
  body {
    font-size: 14px;
  }
  
  .container {
    padding: 0 10px;
  }
  
  .card {
    padding: 12px;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

::-webkit-scrollbar-thumb:active {
  background: rgba(255, 255, 255, 0.4);
}

/* 确保所有链接文本颜色 */
a {
  color: var(--primary-color) !important;
  transition: color 0.3s ease;
}

a:hover {
  color: #00acc1 !important;
}

/* 确保输入框和表单元素在深色主题下正常显示 */
input, textarea, select {
  background-color: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
}

input:focus, textarea:focus, select:focus {
  border-color: var(--primary-color) !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.2) !important;
}
</style>