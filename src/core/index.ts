// ===== Core Exports =====
export { FaceDetectionSDK } from './faceDetectionCore';

// ===== Manager Exports =====
export * as Managers from './managers';

// ===== Type Exports =====
export * from '../types';

// ===== Enum Exports =====
export { FaceDetectionState, FaceDetectionErrorType } from '../types';

// ===== Utility Exports =====
export { processResults } from '../utils/faceDetectionProcessor';
export { handleDataDownload } from '../utils/downloadUtils';
