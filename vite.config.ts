import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端不再注入 API Key，所有请求走 /api 后端
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
