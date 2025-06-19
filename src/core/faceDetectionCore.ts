// 외부 라이브러리 및 모듈 임포트
import {
  processResults,
  processFaceRegionData,
  handleDataDownload,
  CalculatedBoundingBox,
  Detection,
  LastRGB,
  FaceDetectionSDKConfig,
  FaceDetectionState,
  StateChangeCallback,
  MeasurementResult,
  SDKEventCallbacks,
} from './index';
import { FaceDetection } from '@mediapipe/face_detection';
import { updatePositionErrors } from '../utils/facePosition';
import { checkFacePosition } from '../utils/facePositionUtils';
import { createDataString } from '../utils/dataProcessing';
import { waitSeconds } from '../utils/waitSeconds';
import { DEFAULT_SDK_CONFIG } from '../config/defaultConfig';
import packageJson from '../../package.json';

// 인라인 정의
const DEFAULT_ERROR_BOUNDING = 4;
const DEFAULT_FACE_DETECTION_TIMEOUT = 3000;
const DEFAULT_FRAME_INTERVAL = 33.33;
const DEFAULT_FRAME_PROCESS_INTERVAL = 30;
const VIDEO_READY_STATE = 3;

/**
 * FaceDetectionSDK 클래스
 * 얼굴 인식을 통한 생체 신호 측정을 담당하는 메인 SDK 클래스
 */
export class FaceDetectionSDK {
  // SDK 버전 정보
  public static readonly VERSION = packageJson.version;

  // 인라인 처리된 상태 관리
  private currentState: FaceDetectionState = FaceDetectionState.INITIAL;
  private stateChangeCallbacks: StateChangeCallback[] = [];

  // 인라인 처리된 설정 관리
  private config: Required<FaceDetectionSDKConfig>;

  // 인라인 처리된 이벤트 콜백
  private callbacks: SDKEventCallbacks = {};

  // 인라인 처리된 MediaPipe
  private faceDetection: any;

  // 인라인 처리된 웹캠 관리
  private webcamStream: MediaStream | null = null;

  // 인라인 처리된 워커 관리
  private faceRegionWorker!: Worker;
  private lastRGB: LastRGB = { timestamp: 0, r: null, g: null, b: null };

  // 인라인 처리된 얼굴 위치 관리
  private lastPosition = 0;
  private lastYPosition = 0;
  private positionErr = 0;
  private yPositionErr = 0;

  // 인라인 처리된 측정 데이터
  private mean_red: number[] = [];
  private mean_green: number[] = [];
  private mean_blue: number[] = [];
  private timingHist: number[] = [];
  private isCompleted = false;

  // 기존 상태들
  private isFaceDetectiveActive = false;
  private isFaceInCircle = false;
  private isReadyTransitionStarted = false;
  private isInitialized = false;
  private video!: HTMLVideoElement;
  private canvasElement!: HTMLCanvasElement;
  private videoCanvas!: HTMLCanvasElement;
  private videoCtx!: CanvasRenderingContext2D;
  private container!: HTMLElement;
  private ctx!: CanvasRenderingContext2D;
  private lastBoundingBox: CalculatedBoundingBox | null = null;
  private faceDetectionTimer: NodeJS.Timeout | null = null;
  private isFaceDetected = false;
  private isFirstFrame = true;

  /**
   * FaceDetectionSDK 생성자
   * @param config SDK 설정 객체
   * @param callbacks 이벤트 콜백 객체
   */
  constructor(userConfig: FaceDetectionSDKConfig = {}, callbacks: SDKEventCallbacks = {}) {
    this.config = this.mergeConfig(userConfig);
    this.callbacks = callbacks;

    // 상태 변경 핸들러 설정
    if (callbacks.onStateChange) {
      this.stateChangeCallbacks.push(callbacks.onStateChange);
    }

    this.log(`SDK 인스턴스가 생성되었습니다. (v${FaceDetectionSDK.VERSION})`);
  }

  private mergeConfig(userConfig: FaceDetectionSDKConfig): Required<FaceDetectionSDKConfig> {
    return { ...DEFAULT_SDK_CONFIG, ...userConfig } as Required<FaceDetectionSDKConfig>;
  }

  /**
   * SDK 완전 초기화 및 측정 시작
   * HTML 요소 초기화, MediaPipe 설정, 워커 초기화, 측정 시작을 한 번에 수행합니다.
   */
  public async initializeAndStart(): Promise<void> {
    try {
      this.log('SDK 완전 초기화를 시작합니다...');
      await this.initializeElements();
      if (!this.isInitialized) {
        await this.initializeMediaPipe();
        this.initializeWorker();
        this.isInitialized = true;
        this.log('SDK 초기화가 완료되었습니다.');
      }
      await this.handleClickStart();
      this.log('SDK 초기화 및 측정 시작이 완료되었습니다.');
    } catch (error) {
      this.emitError(error as Error, 'SDK 완전 초기화 중 오류');
      throw error;
    }
  }

  /**
   * SDK 정리
   * 리소스를 해제하고 이벤트 리스너를 제거합니다.
   */
  public dispose(): void {
    this.stopDetection();
    if (this.faceRegionWorker) this.faceRegionWorker.terminate();
    if (this.webcamStream) this.webcamStream.getTracks().forEach((track) => track.stop());
    this.faceDetection = null;
    this.stateChangeCallbacks = [];
    this.callbacks = {};
    this.isInitialized = false;
    this.log('SDK가 정리되었습니다.');
  }

  // ===== Private Event Handlers =====

  /**
   * 플랫폼별 다운로드 함수 생성
   */
  private createDownloadFunction(): (dataString: string) => void {
    return (dataString: string) => {
      handleDataDownload(
        dataString,
        {
          enabled: this.config.dataDownload?.enabled || false,
          autoDownload: this.config.dataDownload?.autoDownload || false,
          filename: this.config.dataDownload?.filename || 'rgb_data.txt',
        },
        {
          isAndroid: this.config.platform?.isAndroid || false,
          isIOS: this.config.platform?.isIOS || false,
        },
        this.log.bind(this),
      );
    };
  }

  /**
   * 워커 데이터 처리 핸들러
   */
  private initializeWorker(): void {
    const workerUrl = new URL('../workers/faceRegionWorker.js', import.meta.url);
    this.faceRegionWorker = new Worker(workerUrl, { type: 'module' });
    this.faceRegionWorker.onmessage = ({ data }) => {
      if (!this.isState(FaceDetectionState.MEASURING)) return;
      const lastRGB = processFaceRegionData(data, [], [], [], [], this.lastRGB);
      this.addRGBData(lastRGB);
      this.lastRGB = lastRGB;
    };
  }

  /**
   * 얼굴 인식 설정
   */
  private async initializeMediaPipe(): Promise<void> {
    this.faceDetection = new FaceDetection({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });
    this.faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: this.config.faceDetection?.minDetectionConfidence || 0.5,
      runningMode: 'VIDEO',
    });
    this.faceDetection.onResults(this.setupFaceDetection.bind(this));
  }

  /**
   * 얼굴 인식 처리
   */
  private setupFaceDetection(results: any): void {
    if (!results.detections || results.detections.length === 0) {
      this.emitFaceDetectionChange(false, null);
      this.isFaceInCircle = false;
      this.emitFacePositionChange(false);
      this.resetData();
      this.emitError(
        new Error('얼굴을 인식할 수 없습니다. 조명이 충분한 곳에서 다시 시도해주세요.'),
        'FACE_NOT_DETECTED',
      );
      return;
    }

    const result = processResults(results, {
      isFirstFrame: this.isFirstFrame,
      isFaceDetected: this.isFaceDetected,
      faceDetectionTimer: this.faceDetectionTimer,
      FACE_DETECTION_TIMEOUT: this.config.faceDetection?.timeout || DEFAULT_FACE_DETECTION_TIMEOUT,
      handleFaceDetection: this.handleFaceDetection.bind(this),
      handleNoDetection: () => {},
      mean_red: [],
    });

    this.isFirstFrame = result.isFirstFrame;
    this.isFaceDetected = result.isFaceDetected;
    this.faceDetectionTimer = result.faceDetectionTimer;
    this.lastBoundingBox = result.lastBoundingBox;
  }

  /**
   * 얼굴 인식 처리
   */
  private handleFaceDetection(detection: Detection): void {
    this.emitFaceDetectionChange(true, this.lastBoundingBox);

    // 얼굴 위치 업데이트 (인라인 처리)
    const faceX = detection.boundingBox.xCenter * this.video.videoWidth;
    const faceY = detection.boundingBox.yCenter * this.video.videoHeight;
    const { isInCircle } = checkFacePosition(faceX, faceY, this.video, this.container);

    const { lastPosition, lastYPosition, positionErr, yPositionErr } = updatePositionErrors(
      faceX,
      faceY,
      this.lastPosition,
      this.lastYPosition,
      this.positionErr,
      this.yPositionErr,
      this.config.errorBounding || DEFAULT_ERROR_BOUNDING,
    );

    this.lastPosition = lastPosition;
    this.lastYPosition = lastYPosition;
    this.positionErr = positionErr;
    this.yPositionErr = yPositionErr;

    if (this.isFaceInCircle !== isInCircle) {
      this.isFaceInCircle = isInCircle;
      this.emitFacePositionChange(isInCircle);
    }

    if (this.isState(FaceDetectionState.INITIAL) && !this.isReadyTransitionStarted && isInCircle) {
      this.isReadyTransitionStarted = true;
      this.setState(FaceDetectionState.READY);
      this.startReadyToMeasuringTransition();
    }

    if (!isInCircle) {
      if (this.isState(FaceDetectionState.READY)) {
        this.setState(FaceDetectionState.INITIAL);
        this.isReadyTransitionStarted = false;
      }
      this.resetData();
      this.emitError(new Error('원 안에 얼굴을 위치해주세요.'), 'FACE_OUT_OF_CIRCLE');
      return;
    }

    if (this.isState(FaceDetectionState.MEASURING)) {
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      const faceRegion = this.ctx.getImageData(0, 0, width, height);
      this.faceRegionWorker.postMessage({ faceRegionData: faceRegion });
    }
  }

  /**
   * 얼굴 측정 시작
   */
  public async handleClickStart(): Promise<void> {
    try {
      this.isFaceDetectiveActive = true;
      this.isFaceDetected = false;
      this.isFirstFrame = true;
      this.isFaceInCircle = false;
      this.isReadyTransitionStarted = false;

      // 웹캠 시작 (인라인 처리)
      const videoConfig = {
        width: this.config.video?.width || 640,
        height: this.config.video?.height || 480,
        frameRate: this.config.video?.frameRate || 30,
      };
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: videoConfig });
      this.video.srcObject = this.webcamStream;
      this.video.play();

      this.video.addEventListener('loadeddata', () => {
        let lastFrameTime = 0;
        let frameCount = 0;
        const processVideo = async (): Promise<void> => {
          if (!this.isFaceDetectiveActive || this.video.readyState < VIDEO_READY_STATE) return;
          const now = performance.now();
          const elapsed = now - lastFrameTime;
          const frameInterval = this.config.measurement?.frameInterval || DEFAULT_FRAME_INTERVAL;
          if (elapsed > frameInterval) {
            lastFrameTime = now - (elapsed % frameInterval);
            frameCount++;
            this.videoCtx.drawImage(
              this.video,
              0,
              0,
              this.videoCanvas.width,
              this.videoCanvas.height,
            );
            const frameProcessInterval =
              this.config.measurement?.frameProcessInterval || DEFAULT_FRAME_PROCESS_INTERVAL;
            if (frameCount % frameProcessInterval === 0) {
              await this.faceDetection.send({ image: this.video });
            } else if (this.lastBoundingBox && this.isFaceInCircle) {
              const { left, top, width, height } = this.lastBoundingBox;
              const faceRegion = this.videoCtx.getImageData(left, top, width, height);
              this.faceRegionWorker.postMessage({ faceRegionData: faceRegion });
            }
          }
          requestAnimationFrame(processVideo);
        };
        requestAnimationFrame(processVideo);
      });
    } catch (err) {
      const isIOS = this.config.platform?.isIOS || false;
      this.emitWebcamError(err as Error, isIOS);
    }
  }

  /**
   * 얼굴 인식 종료 시 처리
   */
  public stopDetection(): void {
    if (!this.isFaceDetectiveActive) return;
    this.isFaceDetectiveActive = false;
    if (this.webcamStream) this.webcamStream.getTracks().forEach((track) => track.stop());
    if (this.faceRegionWorker) this.faceRegionWorker.terminate();
    if (this.faceDetectionTimer) {
      clearTimeout(this.faceDetectionTimer);
      this.faceDetectionTimer = null;
    }
  }

  // 상태 관리 메서드들

  /**
   * 현재 상태를 반환합니다.
   */
  public getCurrentState(): FaceDetectionState {
    return this.currentState;
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
    if (index > -1) this.stateChangeCallbacks.splice(index, 1);
  }

  /**
   * 특정 상태인지 확인합니다.
   */
  public isState(state: FaceDetectionState): boolean {
    return this.currentState === state;
  }

  /**
   * 여러 상태 중 하나인지 확인합니다.
   */
  public isAnyState(...states: FaceDetectionState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * 얼굴이 원 안에 있는지 확인합니다.
   */
  public isFaceInsideCircle(): boolean {
    return this.isFaceInCircle;
  }

  /**
   * SDK 버전 정보를 반환합니다.
   */
  public getVersion(): string {
    return FaceDetectionSDK.VERSION;
  }

  // ===== 초기화 메서드들 =====

  /**
   * HTML 요소들 초기화
   */
  public async initializeElements(): Promise<void> {
    if (!this.config.elements) {
      throw new Error(
        'HTML 요소들이 config에 제공되지 않았습니다. config.elements를 설정해주세요.',
      );
    }
    this.video = this.config.elements.video;
    this.canvasElement = this.config.elements.canvasElement;
    this.videoCanvas = this.config.elements.videoCanvas;
    this.container = this.config.elements.container;
    const videoCtx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
    if (!videoCtx) throw new Error('Video canvas context를 가져올 수 없습니다.');
    this.videoCtx = videoCtx;
    const ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context를 가져올 수 없습니다.');
    this.ctx = ctx;
  }

  /**
   * Ready 상태에서 Measuring 상태로 전환
   */
  private async startReadyToMeasuringTransition(): Promise<void> {
    try {
      const delaySeconds = this.config.measurement?.readyToMeasuringDelay || 3;
      for (let remaining = delaySeconds; remaining > 0; remaining--) {
        this.log(`측정 시작까지 ${remaining}초 남았습니다...`);
        await waitSeconds(1);
        if (
          !this.isState(FaceDetectionState.READY) ||
          !this.isFaceDetectiveActive ||
          !this.isFaceInCircle
        )
          return;
      }
      if (
        this.isState(FaceDetectionState.READY) &&
        this.isFaceDetectiveActive &&
        this.isFaceInCircle
      ) {
        this.setState(FaceDetectionState.MEASURING);
      }
    } catch (error) {
      this.log('Ready to measuring 상태 전환 중 오류: ' + String(error));
    }
  }

  /**
   * 디버그 로그
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug?.enableConsoleLog) {
      console.log(`[FaceDetectionSDK] ${message}`, ...args);
    }
  }

  private setState(newState: FaceDetectionState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(newState, previousState);
      } catch (error) {
        console.error('상태 변경 콜백 오류:', error);
      }
    });
  }

  // 이벤트 발생 메서드들 (인라인 처리)
  private emitError(error: Error, context?: string): void {
    const errorMessage = context ? `${context}: ${error.message}` : error.message;
    this.log(`오류 발생: ${errorMessage}`, error);
    if (this.callbacks.onError) {
      this.callbacks.onError({
        type: 'UNKNOWN_ERROR' as any,
        message: errorMessage,
        originalError: error,
      });
    }
  }

  private emitWebcamError(err: Error, isIOS: boolean): void {
    const isPermissionError =
      err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
    const isIOSPermissionError =
      isIOS &&
      err.message &&
      (err.message.includes('permission') ||
        err.message.includes('허가') ||
        err.message.includes('권한'));
    let errorType: string;
    let errorMessage: string;
    if (isPermissionError || isIOSPermissionError) {
      errorType = 'WEBCAM_PERMISSION_DENIED';
      errorMessage =
        '웹캠 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
    } else {
      errorType = 'WEBCAM_ACCESS_FAILED';
      errorMessage = `웹캠에 접근할 수 없습니다: ${err.message}`;
    }
    if (this.callbacks.onError) {
      this.callbacks.onError({ type: errorType as any, message: errorMessage, originalError: err });
    }
  }

  private emitFaceDetectionChange(isDetected: boolean, boundingBox: any): void {
    if (this.callbacks.onFaceDetectionChange) {
      this.callbacks.onFaceDetectionChange(isDetected, boundingBox);
    }
  }

  private emitFacePositionChange(isInCircle: boolean): void {
    if (this.callbacks.onFacePositionChange) {
      this.callbacks.onFacePositionChange(isInCircle);
    }
  }

  private emitProgress(progress: number, dataPoints: number): void {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(progress, dataPoints);
    }
  }

  private emitMeasurementComplete(result: any): void {
    if (this.callbacks.onMeasurementComplete) {
      this.callbacks.onMeasurementComplete(result);
    }
  }

  private addRGBData(lastRGB: LastRGB): void {
    if (this.isCompleted) return;
    if (lastRGB.r !== null && lastRGB.g !== null && lastRGB.b !== null) {
      this.mean_red.push(lastRGB.r);
      this.mean_green.push(lastRGB.g);
      this.mean_blue.push(lastRGB.b);
      this.timingHist.push(lastRGB.timestamp);

      const targetDataPoints = this.config.measurement?.targetDataPoints || 450;
      if (this.timingHist.length > targetDataPoints) {
        const excess = this.timingHist.length - targetDataPoints;
        this.mean_red.splice(0, excess);
        this.mean_green.splice(0, excess);
        this.mean_blue.splice(0, excess);
        this.timingHist.splice(0, excess);
      }

      this.updateProgress();

      if (this.timingHist.length === targetDataPoints) {
        this.finalizeMeasurement();
      }
    }
  }

  private updateProgress(): void {
    if (this.timingHist.length > 0) {
      const targetDataPoints = this.config.measurement?.targetDataPoints || 450;
      const progress = Math.min(this.timingHist.length / targetDataPoints, 1.0);
      this.emitProgress(progress, this.timingHist.length);
    }
  }

  private finalizeMeasurement(): void {
    this.isCompleted = true;
    const dataString = createDataString(
      this.mean_red,
      this.mean_green,
      this.mean_blue,
      this.timingHist,
    );
    const measurementResult: MeasurementResult = {
      rawData: {
        sigR: [...this.mean_red],
        sigG: [...this.mean_green],
        sigB: [...this.mean_blue],
        timestamp: [...this.timingHist].map(Number),
      },
      quality: {
        positionError: this.positionErr,
        yPositionError: this.yPositionErr,
        dataPoints: this.timingHist.length,
      },
    };
    this.emitMeasurementComplete(measurementResult);
    this.createDownloadFunction()(dataString);
  }

  private resetData(): void {
    this.mean_red = [];
    this.mean_green = [];
    this.mean_blue = [];
    this.timingHist = [];
    this.isCompleted = false;
  }
}

// 기존 코드와의 호환성을 위한 별칭
export const FaceDetectionCore = FaceDetectionSDK;

// 기본 내보내기
export default FaceDetectionSDK;
