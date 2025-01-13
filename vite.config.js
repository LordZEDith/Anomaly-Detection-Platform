import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.FRONTEND_PORT),
      proxy: {
        '/api': {
          target: `http://localhost:${env.BACKEND_PORT}`,
          changeOrigin: true,
          secure: false,
          timeout: 30000,
          ws: true
        }
      },
      host: true,
      strictPort: true,
      hmr: {
        timeout: 30000
      }
    }
  };
}); 

