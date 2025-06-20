import {
  FaceDetectionState,
  FaceDetectionErrorType,
  StateChangeCallback,
  SDKEventCallbacks,
} from '../../types/index.js';

export class EventManager {
  private stateChangeCallbacks: StateChangeCallback[] = [];
  private callbacks: SDKEventCallbacks = {};
  private log?: (message: string, ...args: any[]) => void;

  constructor(callbacks: SDKEventCallbacks = {}, log?: (message: string, ...args: any[]) => void) {
    this.callbacks = callbacks;
    this.log = log;
    callbacks.onStateChange && this.onStateChange(callbacks.onStateChange);
  }

  /**
   * 상태 변경 콜백을 등록합니다.
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * 상태 변경 콜백을 제거합니다.
   */
  public removeStateChangeCallback(callback: StateChangeCallback): void {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * 상태 변경 이벤트를 발생시킵니다.
   */
  public emitStateChange(newState: FaceDetectionState, previousState: FaceDetectionState): void {
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(newState, previousState);
      } catch (error) {
        console.error('상태 변경 콜백 실행 중 오류:', error);
      }
    });
  }

  /**
   * 에러 이벤트를 발생시킵니다.
   */
  public emitError(error: Error, errorType?: FaceDetectionErrorType, context?: string): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    const type = errorType ?? FaceDetectionErrorType.UNKNOWN_ERROR;

    this.log?.(`오류 발생: ${message}`);
    this.callbacks.onError?.({ type, message });
  }

  /**
   * 웹캠 에러 이벤트를 발생시킵니다.
   */
  public emitWebcamError(err: Error, isIOS: boolean): void {
    const isPermissionError =
      err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
    const isIOSPermissionError = isIOS && /permission|허가|권한/.test(err.message ?? '');

    const isDenied = isPermissionError || isIOSPermissionError;

    const type = isDenied
      ? FaceDetectionErrorType.WEBCAM_PERMISSION_DENIED
      : FaceDetectionErrorType.WEBCAM_ACCESS_FAILED;

    const message = isDenied
      ? '웹캠 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
      : `웹캠에 접근할 수 없습니다: ${err.message}`;

    this.log?.(`웹캠 오류 발생: ${message}`);
    this.callbacks.onError?.({ type, message });
  }

  /**
   * 얼굴 감지 상태 변경 이벤트를 발생시킵니다.
   */
  public emitFaceDetectionChange(isDetected: boolean, boundingBox: any): void {
    this.callbacks.onFaceDetectionChange?.(isDetected, boundingBox);
  }

  /**
   * 얼굴 위치 변경 이벤트를 발생시킵니다.
   */
  public emitFacePositionChange(isInCircle: boolean): void {
    this.callbacks.onFacePositionChange?.(isInCircle);
  }

  /**
   * 측정 진행률 이벤트를 발생시킵니다.
   */
  public emitProgress(progress: number, dataPoints: number): void {
    this.callbacks.onProgress?.(progress, dataPoints);
  }

  /**
   * 측정 완료 이벤트를 발생시킵니다.
   */
  public emitMeasurementComplete(result: any): void {
    this.callbacks.onMeasurementComplete?.(result);
  }

  /**
   * 카운트다운 이벤트를 발생시킵니다.
   */
  public emitCountdown(remainingSeconds: number, totalSeconds: number): void {
    this.callbacks.onCountdown?.(remainingSeconds, totalSeconds);
  }

  /**
   * 이벤트 콜백을 정리합니다.
   */
  public dispose(): void {
    this.stateChangeCallbacks = [];
    this.callbacks = {};
  }
}
