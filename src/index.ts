// SDK 메인 진입점 - 핵심 클래스만 export
export { FaceDetectionSDK } from './core/faceDetectionCore';
export type { FaceDetectionSDKConfig, SDKEventCallbacks } from './types/index';

// 버전 정보 export (정적 접근용)
import { FaceDetectionSDK } from './core/faceDetectionCore';
export const SDK_VERSION = FaceDetectionSDK.VERSION;

// React SDK export
export * from './react';
