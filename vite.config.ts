import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// 部署到 GitHub Pages 的 https://<user>.github.io/mcu-schedule/
// repo 名稱改了的話這裡要跟著改，否則上線會是白畫面。
export default defineConfig({
  base: '/mcu-schedule/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
