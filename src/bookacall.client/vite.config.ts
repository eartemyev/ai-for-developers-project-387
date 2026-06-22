import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [plugin()],
  server: {
    port: 55281,
    proxy: {
      '/api': {
        target: 'http://localhost:5105',
        changeOrigin: true,
      },
    },
  },
});
