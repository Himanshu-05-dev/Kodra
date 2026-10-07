import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ? env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  };
});
