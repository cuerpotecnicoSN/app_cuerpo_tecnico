import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      external: ['onnxruntime-web/webgpu', 'onnxruntime-web']
    }
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal', 'onnxruntime-web']
  }
})
