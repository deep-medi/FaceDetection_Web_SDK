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

    // 상태 변경 콜백 등록
    if (callbacks.onStateChange) {
      this.onStateChange(callbacks.onStateChange);
    }
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
  public emitError(error: Error, context?: string): void {
    const errorMessage = context ? `${context}: ${error.message}` : error.message;

    // 로그가 있을 때만 출력 (중복 방지)
    if (this.log) {
      this.log(`오류 발생: ${errorMessage}`, error);
    }

    if (this.callbacks.onError) {
      this.callbacks.onError({
        type: FaceDetectionErrorType.UNKNOWN_ERROR,
        message: errorMessage,
        originalError: error,
      });
    }
  }

  /**
   * 웹캠 에러 이벤트를 발생시킵니다.
   */
  public emitWebcamError(err: Error, isIOS: boolean): void {
    const isPermissionError =
      err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
    const isIOSPermissionError =
      isIOS &&
      err.message &&
      (err.message.includes('permission') ||
        err.message.includes('허가') ||
        err.message.includes('권한'));

    let errorType: FaceDetectionErrorType;
    let errorMessage: string;

    if (isPermissionError || isIOSPermissionError) {
      errorType = FaceDetectionErrorType.WEBCAM_PERMISSION_DENIED;
      errorMessage =
        '웹캠 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
    } else {
      errorType = FaceDetectionErrorType.WEBCAM_ACCESS_FAILED;
      errorMessage = `웹캠에 접근할 수 없습니다: ${err.message}`;
    }

    if (this.callbacks.onError) {
      this.callbacks.onError({
        type: errorType,
        message: errorMessage,
        originalError: err,
      });
    }
  }

  /**
   * 얼굴 감지 상태 변경 이벤트를 발생시킵니다.
   */
  public emitFaceDetectionChange(isDetected: boolean, boundingBox: any): void {
    if (this.callbacks.onFaceDetectionChange) {
      this.callbacks.onFaceDetectionChange(isDetected, boundingBox);
    }
  }

  /**
   * 얼굴 위치 변경 이벤트를 발생시킵니다.
   */
  public emitFacePositionChange(isInCircle: boolean): void {
    if (this.callbacks.onFacePositionChange) {
      this.callbacks.onFacePositionChange(isInCircle);
    }
  }

  /**
   * 측정 진행률 이벤트를 발생시킵니다.
   */
  public emitProgress(progress: number, dataPoints: number): void {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(progress, dataPoints);
    }
  }

  /**
   * 측정 완료 이벤트를 발생시킵니다.
   */
  public emitMeasurementComplete(result: any): void {
    if (this.callbacks.onMeasurementComplete) {
      this.callbacks.onMeasurementComplete(result);
    }
  }

  /**
   * 이벤트 콜백을 정리합니다.
   */
  public dispose(): void {
    this.stateChangeCallbacks = [];
    this.callbacks = {};
  }
}
