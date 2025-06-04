// 외부 라이브러리 및 모듈 임포트
import { FaceDetection } from '@mediapipe/face_detection';
import { updatePositionErrors } from '../utils/facePosition.ts';
import { processResults } from '../utils/faceDetectionProcessor.ts';
import { processFaceRegionData } from '../utils/faceRegionWorker.ts';
import { createDataString } from '../utils/dataProcessing.ts';
import { checkFacePosition } from '../utils/facePositionUtils.ts';
import { handleDataDownload } from '../utils/downloadUtils.ts';
import {
  CalculatedBoundingBox,
  Detection,
  LastRGB,
  FaceDetectionSDKConfig,
  FaceDetectionState,
  FaceDetectionErrorType,
  StateChangeCallback,
  MeasurementResult,
  SDKEventCallbacks,
} from '../types/index.js';

// ===== 얼굴 인식 설정 상수 정의 =====

/**
 * 기본 얼굴 인식 설정
 */
export const FACE_DETECTION_CONFIG = {
  model: 'short',
  minDetectionConfidence: 0.5,
  runningMode: 'VIDEO',
};

/**
 * 에러 바운딩 값
 */
export const ERROR_BOUNDING = 4;

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
};

export class FaceDetectionSDK {
  // SDK 설정
  private config: Required<FaceDetectionSDKConfig>;
  private callbacks: SDKEventCallbacks = {};

  // 상태 관리
  private currentState: FaceDetectionState = FaceDetectionState.INITIAL;
  private stateChangeCallbacks: StateChangeCallback[] = [];

  // 플랫폼 관련
  private downloadRgbData: (dataString: string) => void;

  // HTML 요소들
  private video!: HTMLVideoElement;
  private canvasElement!: HTMLCanvasElement;
  private videoCanvas!: HTMLCanvasElement;
  private videoCtx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // 얼굴 인식 관련 변수들
  private isFaceDetectiveActive: boolean = false;
  private ctx!: CanvasRenderingContext2D;
  private mean_red: number[] = [];
  private mean_green: number[] = [];
  private mean_blue: number[] = [];
  private timingHist: number[] = [];
  private lastPosition: number = 0;
  private lastYPosition: number = 0;
  private positionErr: number = 0;
  private yPositionErr: number = 0;

  // 스트림 및 감지 관련
  private webcamStream: MediaStream | null = null;
  private lastBoundingBox: CalculatedBoundingBox | null = null;
  private faceDetectionTimer: NodeJS.Timeout | null = null;
  private isFaceDetected: boolean = false;
  private isFirstFrame: boolean = true;

  // 얼굴 위치 상태
  private isFaceInCircle: boolean = false;

  // ready 상태 전환 플래그
  private isReadyTransitionStarted: boolean = false;

  // MediaPipe 및 워커
  private faceDetection!: any;
  private faceRegionWorker!: Worker;
  private lastRGB!: LastRGB;

  // 초기화 상태
  private isInitialized: boolean = false;
  private isElementsInitialized: boolean = false;

  // 측정 결과 저장
  private measurementResult: MeasurementResult | null = null;

  /**
   * FaceDetectionSDK 생성자
   * @param config SDK 설정 객체
   * @param callbacks 이벤트 콜백 객체
   */
  constructor(config: FaceDetectionSDKConfig = {}, callbacks: SDKEventCallbacks = {}) {
    // 설정 병합 (기본값 + 사용자 설정)
    this.config = this.mergeConfig(DEFAULT_SDK_CONFIG, config);
    this.callbacks = callbacks;

    // 플랫폼별 다운로드 함수 설정
    this.downloadRgbData = this.createDownloadFunction();

    // 상태 변경 콜백 등록
    if (callbacks.onStateChange) {
      this.onStateChange(callbacks.onStateChange);
    }

    this.log('SDK 인스턴스가 생성되었습니다.');
  }

  /**
   * SDK 초기화
   * HTML 요소들을 생성하고 MediaPipe를 설정합니다.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.log('SDK 초기화를 시작합니다...');

      // MediaPipe 초기화
      await this.initializeMediaPipe();

      // 워커 초기화
      this.initializeWorker();

      this.isInitialized = true;
      this.log('SDK 초기화가 완료되었습니다.');
    } catch (error) {
      this.handleError(error as Error, 'SDK 초기화 중 오류가 발생했습니다.');
      throw error;
    }
  }

  /**
   * 측정 시작
   */
  public async startMeasurement(): Promise<void> {
    if (!this.isElementsInitialized) {
      throw new Error('HTML 요소가 초기화되지 않았습니다. initializeElements()를 먼저 호출하세요.');
    }
    if (!this.isInitialized) {
      throw new Error('SDK가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.');
    }

    await this.handleClickStart();
  }

  /**
   * SDK 정리
   * 리소스를 해제하고 이벤트 리스너를 제거합니다.
   */
  public dispose(): void {
    this.stopDetection();

    // 워커 종료
    if (this.faceRegionWorker) {
      this.faceRegionWorker.terminate();
    }

    // 스트림 정리
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
    }

    // 콜백 정리
    this.stateChangeCallbacks = [];
    this.callbacks = {};

    // 상태 초기화
    this.isInitialized = false;
    this.isElementsInitialized = false;

    this.log('SDK가 정리되었습니다.');
  }

  // ===== 설정 관련 메서드 =====

  /**
   * 설정 병합 (깊은 병합)
   */
  private mergeConfig(
    defaultConfig: Omit<Required<FaceDetectionSDKConfig>, 'elements'>,
    userConfig: FaceDetectionSDKConfig,
  ): Required<FaceDetectionSDKConfig> {
    const merged = JSON.parse(JSON.stringify(defaultConfig)) as any;

    Object.keys(userConfig).forEach((key) => {
      const userValue = userConfig[key as keyof FaceDetectionSDKConfig];
      if (userValue !== undefined) {
        if (key === 'elements') {
          merged[key] = userValue;
        } else if (typeof userValue === 'object' && !Array.isArray(userValue)) {
          merged[key] = { ...merged[key], ...userValue };
        } else {
          merged[key] = userValue;
        }
      }
    });

    return merged;
  }

  /**
   * 플랫폼별 다운로드 함수 생성
   */
  private createDownloadFunction(): (dataString: string) => void {
    return (dataString: string) => {
      handleDataDownload(
        dataString,
        {
          enabled: this.config.dataDownload.enabled!,
          autoDownload: this.config.dataDownload.autoDownload!,
          filename: this.config.dataDownload.filename!,
        },
        {
          isAndroid: this.config.platform.isAndroid,
          isIOS: this.config.platform.isIOS,
        },
        this.log.bind(this),
      );
    };
  }

  /**
   * 디버그 로그
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug.enableConsoleLog) {
      console.log(`[FaceDetectionSDK] ${message}`, ...args);
    }
  }

  /**
   * 오류 처리
   */
  private handleError(error: Error, context?: string): void {
    const errorMessage = context ? `${context}: ${error.message}` : error.message;
    this.log(`오류 발생: ${errorMessage}`, error);

    if (this.callbacks.onError) {
      this.callbacks.onError({
        type: FaceDetectionErrorType.UNKNOWN_ERROR,
        message: errorMessage,
        originalError: error,
      });
    }
  }

  // 워커 설정
  private setupWorker(): void {
    this.faceRegionWorker.onmessage = ({ data }) => {
      // MEASURING 상태일 때만 데이터 수집
      if (!this.isState(FaceDetectionState.MEASURING)) {
        return;
      }

      this.lastRGB = processFaceRegionData(
        data,
        this.mean_red,
        this.mean_green,
        this.mean_blue,
        this.timingHist,
        this.lastRGB,
      );

      if (this.timingHist.length > this.config.measurement.targetDataPoints!) {
        const excess = this.timingHist.length - this.config.measurement.targetDataPoints!;

        this.mean_red.splice(0, excess);
        this.mean_green.splice(0, excess);
        this.mean_blue.splice(0, excess);
        this.timingHist.splice(0, excess);
      }

      // 데이터 수집 시마다 진행률 계산
      if (this.timingHist.length > 0) {
        // 데이터 개수 기준으로 진행률 계산 (목표 데이터 개수 기준)
        const progress = Math.min(
          this.timingHist.length / this.config.measurement.targetDataPoints!,
          1.0,
        );

        // 진행률 콜백 호출
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress(progress, this.timingHist.length);
        }

        // 정확히 목표 데이터 개수에 도달했을 때 결과 처리
        if (this.timingHist.length === this.config.measurement.targetDataPoints!) {
          this.finalizeMeasurement();
        }
      }
    };
  }

  // 얼굴 인식 설정
  private setupFaceDetection(): void {
    this.faceDetection.onResults((results: any) => {
      // 1. 먼저 얼굴 인식 여부 판단 (최우선)
      const hasDetections = results.detections && results.detections.length > 0;

      if (!hasDetections) {
        // 얼굴 인식 실패 - 원 위치와 상관없이 처리
        this.handleNoDetection();
        return;
      }

      // 2. 얼굴 인식 성공 - 기존 로직으로 처리
      const result = processResults(results, {
        isFirstFrame: this.isFirstFrame,
        isFaceDetected: this.isFaceDetected,
        faceDetectionTimer: this.faceDetectionTimer,
        FACE_DETECTION_TIMEOUT: this.config.faceDetection.timeout!,
        handleFaceDetection: this.handleFaceDetection.bind(this),
        handleNoDetection: this.handleNoDetection.bind(this),
        mean_red: this.mean_red,
      });

      this.isFirstFrame = result.isFirstFrame;
      this.isFaceDetected = result.isFaceDetected;
      this.faceDetectionTimer = result.faceDetectionTimer;
      this.lastBoundingBox = result.lastBoundingBox;
    });
  }

  // 얼굴 인식 처리
  private handleFaceDetection(detection: Detection): void {
    // 얼굴 감지 성공 콜백 호출
    if (this.callbacks.onFaceDetectionChange) {
      this.callbacks.onFaceDetectionChange(true, this.lastBoundingBox);
    }

    const { boundingBox } = detection; // 바운딩 박스 추출
    const faceX = boundingBox.xCenter * this.video.videoWidth; // 얼굴 위치 x 좌표
    const faceY = boundingBox.yCenter * this.video.videoHeight; // 얼굴 위치 y 좌표

    // 얼굴 위치 체크
    const { isInCircle } = checkFacePosition(faceX, faceY, this.video, this.container);

    // 얼굴 위치 상태 업데이트
    if (this.isFaceInCircle !== isInCircle) {
      this.isFaceInCircle = isInCircle;

      // 얼굴 위치 변경 콜백 호출
      if (this.callbacks.onFacePositionChange) {
        this.callbacks.onFacePositionChange(isInCircle);
      }
    }

    // 얼굴이 원 안에 들어왔을 때 initial 상태라면 ready 상태로 전환
    if (this.isState(FaceDetectionState.INITIAL) && !this.isReadyTransitionStarted && isInCircle) {
      this.isReadyTransitionStarted = true;
      this.setState(FaceDetectionState.READY);

      // 카운트다운 시작
      this.startReadyToMeasuringTransition();
    }

    // 얼굴이 제 위치에 있는지 확인 후 텍스트 업데이트
    const prepareMessage = document.querySelector(
      '[data-i18n="measure.measuringMessage"]',
    ) as HTMLElement;
    if (prepareMessage) {
      prepareMessage.textContent = isInCircle
        ? '측정 중입니다...'
        : '얼굴을 올바르게 위치해주세요.';
    }

    // 좌표로 에러 카운트
    const {
      lastPosition: newLastPosition,
      lastYPosition: newLastYPosition,
      positionErr: newPositionErr,
      yPositionErr: newYPositionErr,
    } = updatePositionErrors(
      faceX,
      faceY,
      this.lastPosition,
      this.lastYPosition,
      this.positionErr,
      this.yPositionErr,
      ERROR_BOUNDING,
    );

    // 좌표 갱신
    this.lastPosition = newLastPosition;
    this.lastYPosition = newLastYPosition;
    this.positionErr = newPositionErr;
    this.yPositionErr = newYPositionErr;

    // 얼굴이 원 안에 없다면 데이터 초기화 및 데이터 수집 중단
    if (!isInCircle) {
      // ready 상태였다면 initial로 되돌림 (카운트다운 중단을 위해)
      if (this.isState(FaceDetectionState.READY)) {
        this.setState(FaceDetectionState.INITIAL);
        this.isReadyTransitionStarted = false; // 플래그 리셋
      }

      // 수집된 데이터 초기화
      this.mean_red = [];
      this.mean_green = [];
      this.mean_blue = [];
      this.timingHist = [];

      // 얼굴이 원 밖에 있다는 에러 콜백 호출
      if (this.callbacks.onError) {
        this.callbacks.onError({
          type: FaceDetectionErrorType.FACE_OUT_OF_CIRCLE,
          message: '원 안에 얼굴을 위치해주세요.',
        });
      }

      return;
    }

    // 얼굴 영역에서 RGB 데이터 추출 (measuring 상태일 때만)
    if (this.isState(FaceDetectionState.MEASURING)) {
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      const faceRegion = this.ctx.getImageData(0, 0, width, height);
      this.faceRegionWorker.postMessage({ faceRegionData: faceRegion });
    }
  }

  // ready 상태에서 measuring 상태로 전환하는 비동기 함수
  private async startReadyToMeasuringTransition(): Promise<void> {
    try {
      const delaySeconds = this.config.measurement.readyToMeasuringDelay!;

      // 1초씩 카운트다운
      for (let remaining = delaySeconds; remaining > 0; remaining--) {
        this.log(`측정 시작까지 ${remaining}초 남았습니다...`);
        await this.waitSeconds(1);

        // 매 초마다 상태 확인 - 상태가 변경되었거나 얼굴이 원을 벗어났다면 중단
        if (
          !this.isState(FaceDetectionState.READY) ||
          !this.isFaceDetectiveActive ||
          !this.isFaceInCircle
        ) {
          return;
        }
      }

      // 여전히 ready 상태이고 얼굴 인식이 활성화되어 있고 얼굴이 원 안에 있다면 measuring으로 전환
      if (
        this.isState(FaceDetectionState.READY) &&
        this.isFaceDetectiveActive &&
        this.isFaceInCircle
      ) {
        this.setState(FaceDetectionState.MEASURING);
      }
    } catch (error) {
      // 에러 발생 시 로그만 출력 (상태 전환 실패는 치명적이지 않음)
      this.log('Ready to measuring 상태 전환 중 오류:', error);
    }
  }

  // 측정 완료 시 처리
  private finalizeMeasurement(): string {
    this.setState(FaceDetectionState.COMPLETED);
    this.isFaceDetectiveActive = false;

    const dataString = createDataString(
      this.mean_red,
      this.mean_green,
      this.mean_blue,
      this.timingHist,
    );

    // 측정 결과 생성 및 저장
    this.measurementResult = {
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

    // 측정 완료 콜백 호출
    if (this.callbacks.onMeasurementComplete && this.measurementResult) {
      this.callbacks.onMeasurementComplete(this.measurementResult);
    }

    // RGB 데이터 다운로드 (플랫폼별 함수 사용)
    this.downloadRgbData(dataString);

    return dataString;
  }

  // 얼굴 인식 실패 시 처리
  private handleNoDetection(): void {
    // 얼굴 감지 상태 콜백 호출
    if (this.callbacks.onFaceDetectionChange) {
      this.callbacks.onFaceDetectionChange(false, null);
    }

    // 얼굴이 감지되지 않으면 원 안에 있지 않다고 설정
    if (this.isFaceInCircle) {
      this.isFaceInCircle = false;
    }

    // ready 상태였다면 initial로 되돌림
    if (this.isState(FaceDetectionState.READY)) {
      this.setState(FaceDetectionState.INITIAL);
      this.isReadyTransitionStarted = false; // 플래그 리셋
    }

    // 수집된 데이터 초기화 (얼굴이 인식되지 않으면 데이터 수집 중단)
    this.mean_red = [];
    this.mean_green = [];
    this.mean_blue = [];
    this.timingHist = [];

    // 얼굴 인식 실패 에러 콜백 호출 (상태 변경 없음)
    if (this.callbacks.onError) {
      this.callbacks.onError({
        type: FaceDetectionErrorType.FACE_NOT_DETECTED,
        message: '얼굴을 인식할 수 없습니다. 조명이 충분한 곳에서 다시 시도해주세요.',
      });
    }
  }

  private async waitSeconds(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  // 얼굴 인식 종료 시 처리
  public stopDetection(): void {
    if (!this.isFaceDetectiveActive) return;

    this.isFaceDetectiveActive = false;
    this.webcamStream?.getTracks().forEach((track) => track.stop());

    if (this.faceRegionWorker) {
      this.faceRegionWorker.terminate();
    }

    if (this.faceDetectionTimer) {
      clearTimeout(this.faceDetectionTimer);
      this.faceDetectionTimer = null;
    }
  }

  // 얼굴 측정 시작
  public async handleClickStart(): Promise<void> {
    try {
      this.isFaceDetectiveActive = true; // 얼굴 인식 활성화
      this.isFaceDetected = false; // 얼굴 인식 여부
      this.isFirstFrame = true; // 첫 프레임 여부
      this.isFaceInCircle = false; // 얼굴 위치 상태 초기화
      this.isReadyTransitionStarted = false; // ready 전환 플래그 초기화

      // 웹캠 스트림 설정 (설정값 사용)
      const videoConfig = {
        width: this.config.video.width,
        height: this.config.video.height,
        frameRate: this.config.video.frameRate,
      };

      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: videoConfig,
      });
      this.video.srcObject = this.webcamStream;
      this.video.play();

      this.video.addEventListener('loadeddata', () => {
        let lastFrameTime = 0;
        let frameCount = 0;

        const processVideo = async (): Promise<void> => {
          if (!this.isFaceDetectiveActive || this.video.readyState < 3) return;
          const now = performance.now();
          const elapsed = now - lastFrameTime;
          if (elapsed > this.config.measurement.frameInterval!) {
            lastFrameTime = now - (elapsed % this.config.measurement.frameInterval!);
            frameCount++;

            this.videoCtx.drawImage(
              this.video,
              0,
              0,
              this.videoCanvas.width,
              this.videoCanvas.height,
            );

            if (frameCount % this.config.measurement.frameProcessInterval! === 0) {
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
      this.handleWebcamError(err as Error);
    }
  }

  // 웹캠 에러 처리 (플랫폼별 차이 반영)
  private handleWebcamError(err: Error): void {
    let errorType: FaceDetectionErrorType;
    let errorMessage: string;

    // 권한 오류 확인
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorType = FaceDetectionErrorType.WEBCAM_PERMISSION_DENIED;
      errorMessage =
        '웹캠 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
    } else if (
      this.config.platform.isIOS &&
      err.message &&
      (err.message.includes('permission') ||
        err.message.includes('허가') ||
        err.message.includes('권한'))
    ) {
      errorType = FaceDetectionErrorType.WEBCAM_PERMISSION_DENIED;
      errorMessage =
        '웹캠 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
    } else {
      errorType = FaceDetectionErrorType.WEBCAM_ACCESS_FAILED;
      errorMessage = `웹캠에 접근할 수 없습니다: ${err.message}`;
    }

    // 에러 콜백 호출
    if (this.callbacks.onError) {
      this.callbacks.onError({
        type: errorType,
        message: errorMessage,
        originalError: err,
      });
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
   * 상태를 변경하고 콜백을 호출합니다.
   */
  private setState(newState: FaceDetectionState): void {
    const previousState = this.currentState;
    this.currentState = newState;

    // 모든 콜백 호출
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(newState, previousState);
      } catch (error) {
        console.error('상태 변경 콜백 실행 중 오류:', error);
      }
    });
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

  // ===== 초기화 메서드들 =====

  /**
   * HTML 요소들 초기화 (외부에서 호출 가능)
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

    // 비디오 캔버스 컨텍스트 초기화
    const videoCtx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
    if (!videoCtx) throw new Error('Video canvas context를 가져올 수 없습니다.');
    this.videoCtx = videoCtx;

    // 출력 캔버스 컨텍스트 초기화
    const ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context를 가져올 수 없습니다.');
    this.ctx = ctx;

    this.isElementsInitialized = true;
  }

  /**
   * MediaPipe 초기화
   */
  private async initializeMediaPipe(): Promise<void> {
    this.faceDetection = new FaceDetection({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    // 설정에서 가져온 값으로 얼굴 인식 옵션 설정
    const faceDetectionConfig = {
      ...FACE_DETECTION_CONFIG,
      minDetectionConfidence: this.config.faceDetection.minDetectionConfidence,
    };

    this.faceDetection.setOptions(faceDetectionConfig);
    this.setupFaceDetection();
  }

  /**
   * 워커 초기화
   */
  private initializeWorker(): void {
    this.faceRegionWorker = new Worker(new URL('../workers/faceRegionWorker.js', import.meta.url));
    this.lastRGB = { timestamp: 0, r: null, g: null, b: null };
    this.setupWorker();
  }
}

// 기존 코드와의 호환성을 위한 별칭
export const FaceDetectionCore = FaceDetectionSDK;

// 기본 내보내기
export default FaceDetectionSDK;
