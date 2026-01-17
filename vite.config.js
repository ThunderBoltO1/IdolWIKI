import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Debug: แสดงข้อมูล Environment ของ Server ใน Build Logs
console.log('========================================');
console.log('SERVER NODE VERSION:', process.version);
console.log('SERVER PLATFORM:', process.platform);
console.log('========================================');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            return 'vendor';
          }
        },
      },
    },
  },
})