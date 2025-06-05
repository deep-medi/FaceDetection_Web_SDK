import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import dts from 'vite-plugin-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  if (isLib) {
    // 라이브러리 빌드 설정
    return {
      plugins: [
        dts({
          insertTypesEntry: true,
          copyDtsFiles: true,
        }),
      ],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'FaceDetectionWebSDK',
          formats: ['es', 'cjs'],
          fileName: (format) => `index.${format === 'es' ? 'es.js' : 'js'}`,
        },
        rollupOptions: {
          external: ['@mediapipe/face_detection'],
          output: {
            globals: {
              '@mediapipe/face_detection': 'FaceDetection',
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
          '@deep-medi/face-detection-web-sdk': path.resolve(__dirname, './src/index.ts'),
        },
      },
    };
  }

  // 기존 개발/데모 빌드 설정
  return {
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
        '@deep-medi/face-detection-web-sdk': path.resolve(__dirname, './src/index.ts'),
      },
    },
  };
});
