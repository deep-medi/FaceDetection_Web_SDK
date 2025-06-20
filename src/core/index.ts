// ===== Core Exports =====
export { FaceDetectionSDK } from './faceDetectionCore';

// ===== Manager Exports =====
export * as Managers from './managers';

// ===== Type Exports =====
export type {
  CalculatedBoundingBox,
  Detection,
  LastRGB,
  FaceDetectionSDKConfig,
  StateChangeCallback,
  MeasurementResult,
  SDKEventCallbacks,
} from '../types';

// ===== Enum Exports =====
export { FaceDetectionState, FaceDetectionErrorType } from '../types';

// ===== Utility Exports =====
export { processResults } from '../utils/faceDetectionProcessor';
export { processFaceRegionData } from '../utils/faceRegionWorker';
export { handleDataDownload } from '../utils/downloadUtils';
