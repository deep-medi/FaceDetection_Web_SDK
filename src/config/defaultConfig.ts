import { FaceDetectionSDKConfig } from '@/types';

/**
 * 기본 SDK 설정
 */
export const DEFAULT_SDK_CONFIG: Omit<Required<FaceDetectionSDKConfig>, 'elements'> = {
  platform: {
    isIOS: false,
    isAndroid: false,
  },
  measurement: {
    targetDataPoints: 450,
    frameInterval: 33.33,
    frameProcessInterval: 30,
    readyToMeasuringDelay: 3,
  },
  faceDetection: {
    timeout: 3000,
    minDetectionConfidence: 0.5,
  },
  video: {
    width: 640,
    height: 480,
    frameRate: 30,
  },
  ui: {
    containerId: 'face-detection-container',
    customClasses: {
      container: '',
      video: '',
      canvas: '',
      progress: '',
    },
  },
  server: {
    baseUrl: '',
    timeout: 30000,
  },
  debug: {
    enabled: false,
    enableConsoleLog: false,
  },
  dataDownload: {
    enabled: false,
    autoDownload: false,
    filename: 'rgb_data.txt',
  },
  errorBounding: 4,
};
