import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  if (isLib) {
    // 라이브러리 빌드 설정
    return {
      plugins: [
        react(),
        dts({
          include: ['src/**/*'],
          exclude: ['src/react/**/*'],
        }),
      ],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'FaceDetectionSDK',
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'es' : 'js'}`,
        },
        rollupOptions: {
          external: ['@mediapipe/face_detection'],
          output: {
            globals: {
              '@mediapipe/face_detection': 'MediaPipeFaceDetection',
            },
          },
        },
        sourcemap: true,
        minify: 'terser',
      },
      worker: {
        format: 'es',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          'face-detection-web-sdk': path.resolve(__dirname, './src/index.ts'),
        },
      },
    };
  }

  // React 데모 모드
  if (process.env.npm_lifecycle_event === 'demo:react') {
    return {
      plugins: [react()],
      root: 'examples/react-demo',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
    };
  }

  // 기본 개발 모드 (React SDK 포함)
  return {
    plugins: [react()],
    server: {
      port: 8080,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'face-detection-web-sdk': path.resolve(__dirname, './src/index.ts'),
      },
    },
  };
});
