import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 解决某些依赖可能需要的 Node.js 模块别名
      stream: 'stream-browserify',
      crypto: 'crypto-browserify'
    }
  },
  define: {
    // 定义全局变量，解决 'global' is not defined 错误
    global: 'window'
  }
})