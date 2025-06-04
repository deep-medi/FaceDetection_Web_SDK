// SDK 메인 진입점
export {
  FaceDetectionSDK,
  DEFAULT_SDK_CONFIG,
  FACE_DETECTION_CONFIG,
} from './common/faceDetectionCore';

// 타입 정의 내보내기
export type {
  FaceDetectionSDKConfig,
  FaceDetectionState,
  FaceDetectionErrorType,
  StateChangeCallback,
  MeasurementResult,
  SDKEventCallbacks,
  CalculatedBoundingBox,
  Detection,
  LastRGB,
} from './types/index';

// 유틸리티 함수들 (필요한 경우)
export { checkFacePosition } from './utils/facePositionUtils';
export { handleDataDownload } from './utils/downloadUtils';

// 상수 내보내기
export { FaceDetectionState as State } from './types/index';
