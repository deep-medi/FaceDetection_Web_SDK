// ===== Core Exports =====
export { FaceDetectionSDK } from './faceDetectionCore';

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
export { FaceDetectionState } from '../types';

// ===== Utility Exports =====
export { processResults } from '../utils/faceDetectionProcessor';
export { processFaceRegionData } from '../utils/faceRegionWorker';
export { handleDataDownload } from '../utils/downloadUtils';
