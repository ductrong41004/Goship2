import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config riêng cho build APK Android — KHÔNG dùng cho GitHub Pages
// Dùng lệnh: npm run build:android
export default defineConfig({
  base: '/',
  plugins: [
    react(),
  ],
  build: {
    outDir: 'dist-android',
  }
})
