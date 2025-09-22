import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.HTTPS_PROXY': JSON.stringify('http://localhost:7890'),
        'process.env.HTTP_PROXY': JSON.stringify('http://localhost:7890')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // 配置代理，转发 Gemini API 请求通过本地 7890 端口
      server: {
        proxy: {
          // 匹配所有以 Gemini API 域名开头的请求
          '/v1beta': {
            target: 'https://generativelanguage.googleapis.com',
            changeOrigin: true,
            rewrite: (path) => path
          }
        }
      },
      // 为开发服务器设置代理环境变量
      envPrefix: 'VITE_'
    };
});
