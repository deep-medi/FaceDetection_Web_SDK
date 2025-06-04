import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

export default defineConfig({
  plugins: [basicSsl({})],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    https: {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_SERVER_URL || 'https://default-api.com',
    ),
  },
});
