// 외부 라이브러리 및 모듈 임포트

import { processResults } from '../utils/faceDetectionProcessor.ts';
import { processFaceRegionData } from '../utils/faceRegionWorker.ts';
import { handleDataDownload } from '../utils/downloadUtils.ts';
import {
  CalculatedBoundingBox,
  Detection,
  LastRGB,
  FaceDetectionSDKConfig,
  FaceDetectionState,
  StateChangeCallback,
  MeasurementResult,
  SDKEventCallbacks,
} from '../types/index.js';
import { ConfigManager } from './managers/ConfigManager.js';
import { EventManager } from './managers/EventManager.js';
import { MediapipeManager } from './managers/MediapipeManager.js';
import { StateManager } from './managers/StateManager.js';
import { WebcamManager } from './managers/WebcamManager.js';
import { FacePositionManager } from './managers/FacePositionManager.js';
import { WorkerManager } from './managers/WorkerManager.js';
import { MeasurementManager } from './managers/MeasurementManager.js';
import packageJson from '../../package.json';

export class FaceDetectionSDK {
  // SDK 버전 정보
  public static readonly VERSION = packageJson.version;

  // SDK 설정
  private configManager: ConfigManager;
  private eventManager: EventManager;
  private mediapipeManager: MediapipeManager;
  private stateManager: StateManager;
  private webcamManager: WebcamManager;
  private facePositionManager: FacePositionManager;
  private workerManager: WorkerManager;
  private measurementManager: MeasurementManager;

  // 상태 관리
  private isFaceDetectiveActive: boolean = false;
  private isFaceInCircle: boolean = false;
  private isReadyTransitionStarted: boolean = false;
  private isInitialized: boolean = false;
  private isElementsInitialized: boolean = false;

  // HTML 요소들
  private video!: HTMLVideoElement;
  private canvasElement!: HTMLCanvasElement;
  private videoCanvas!: HTMLCanvasElement;
  private videoCtx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

  // 얼굴 인식 관련 변수들
  private ctx!: CanvasRenderingContext2D;

  // 스트림 및 감지 관련
  private lastBoundingBox: CalculatedBoundingBox | null = null;
  private faceDetectionTimer: NodeJS.Timeout | null = null;
  private isFaceDetected: boolean = false;
  private isFirstFrame: boolean = true;

  /**
   * FaceDetectionSDK 생성자
   * @param config SDK 설정 객체
   * @param callbacks 이벤트 콜백 객체
   */
  constructor(config: FaceDetectionSDKConfig = {}, callbacks: SDKEventCallbacks = {}) {
    // ConfigManager 초기화
    this.configManager = new ConfigManager(config);

    // EventManager 초기화 (로그 콜백 제거하여 중복 방지)
    this.eventManager = new EventManager(callbacks);

    // StateManager 초기화
    this.stateManager = new StateManager(this.eventManager);

    // MediapipeManager 초기화
    this.mediapipeManager = new MediapipeManager();

    // WebcamManager 초기화
    this.webcamManager = new WebcamManager(
      this.configManager.getConfig(),
      this.handleWebcamError.bind(this),
    );

    // FacePositionManager 초기화
    this.facePositionManager = new FacePositionManager(
      this.configManager.getConfig().errorBounding || 4,
    );

    // WorkerManager 초기화
    this.workerManager = new WorkerManager(this.handleWorkerData.bind(this));

    // MeasurementManager 초기화
    this.measurementManager = new MeasurementManager(
      this.configManager.getConfig(),
      this.eventManager.emitProgress.bind(this.eventManager),
      this.handleMeasurementComplete.bind(this),
      this.createDownloadFunction(),
      (msg: string) => this.log(msg),
    );

    this.log(`SDK 인스턴스가 생성되었습니다. (v${FaceDetectionSDK.VERSION})`);
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
      this.workerManager.initialize();

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
    this.workerManager.terminate();

    // 웹캠 정리
    this.webcamManager.dispose();

    // MediapipeManager 정리
    this.mediapipeManager.dispose();

    // 이벤트 매니저 정리
    this.eventManager.dispose();

    // 상태 초기화
    this.isInitialized = false;
    this.isElementsInitialized = false;

    this.log('SDK가 정리되었습니다.');
  }

  /**
   * 플랫폼별 다운로드 함수 생성
   */
  private createDownloadFunction(): (dataString: string) => void {
    return (dataString: string) => {
      const config = this.configManager.getConfig();
      handleDataDownload(
        dataString,
        {
          enabled: config.dataDownload?.enabled || false,
          autoDownload: config.dataDownload?.autoDownload || false,
          filename: config.dataDownload?.filename || 'rgb_data.txt',
        },
        {
          isAndroid: config.platform?.isAndroid || false,
          isIOS: config.platform?.isIOS || false,
        },
        this.log.bind(this),
      );
    };
  }

  /**
   * 측정 완료 콜백 핸들러
   */
  private handleMeasurementComplete(result: MeasurementResult): void {
    // 에러 카운트 반영
    const { positionErr, yPositionErr } = this.facePositionManager.getPositionErrors();
    const patchedResult = {
      ...result,
      quality: {
        ...result.quality,
        positionError: positionErr,
        yPositionError: yPositionErr,
      },
    };
    this.stateManager.setState(FaceDetectionState.COMPLETED);
    this.isFaceDetectiveActive = false;
    this.eventManager.emitMeasurementComplete(patchedResult);
  }

  /**
   * 워커 데이터 처리 핸들러
   */
  private handleWorkerData(data: any): LastRGB {
    // MEASURING 상태일 때만 데이터 수집
    if (
      !this.stateManager.isState(FaceDetectionState.MEASURING) ||
      this.stateManager.isState(FaceDetectionState.COMPLETED)
    ) {
      return this.workerManager.getLastRGB();
    }

    const lastRGB = processFaceRegionData(
      data,
      [], // mean_red, mean_green, mean_blue는 MeasurementManager에서 관리
      [], // mean_green
      [], // mean_blue
      [], // timingHist
      this.workerManager.getLastRGB(),
    );

    // MeasurementManager에 데이터 추가
    this.measurementManager.addRGBData(lastRGB);

    return lastRGB;
  }

  /**
   * 디버그 로그
   */
  private log(message: string, ...args: any[]): void {
    const config = this.configManager.getConfig();
    if (config.debug?.enableConsoleLog) {
      console.log(`[FaceDetectionSDK] ${message}`, ...args);
    }
  }

  /**
   * 오류 처리
   */
  private handleError(error: Error, context?: string): void {
    this.eventManager.emitError(error, context);
  }

  // 얼굴 인식 설정
  private setupFaceDetection(): void {
    this.mediapipeManager.setOnResultsCallback((results: any) => {
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
        FACE_DETECTION_TIMEOUT: this.configManager.getConfig().faceDetection?.timeout || 3000,
        handleFaceDetection: this.handleFaceDetection.bind(this),
        handleNoDetection: this.handleNoDetection.bind(this),
        mean_red: [], // MeasurementManager에서 관리
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
    this.eventManager.emitFaceDetectionChange(true, this.lastBoundingBox);

    // FacePositionManager를 사용하여 얼굴 위치 업데이트
    const { isInCircle } = this.facePositionManager.updateFacePosition(
      detection.boundingBox,
      this.video,
      this.container,
    );

    // 얼굴 위치 상태 업데이트
    if (this.isFaceInCircle !== isInCircle) {
      this.isFaceInCircle = isInCircle;
      this.eventManager.emitFacePositionChange(isInCircle);
    }

    // 얼굴이 원 안에 들어왔을 때 initial 상태라면 ready 상태로 전환
    if (
      this.stateManager.isState(FaceDetectionState.INITIAL) &&
      !this.isReadyTransitionStarted &&
      isInCircle
    ) {
      this.isReadyTransitionStarted = true;
      this.stateManager.setState(FaceDetectionState.READY);

      // 카운트다운 시작
      this.startReadyToMeasuringTransition();
    }

    // 얼굴이 원 안에 없다면 데이터 초기화 및 데이터 수집 중단
    if (!isInCircle) {
      // ready 상태였다면 initial로 되돌림 (카운트다운 중단을 위해)
      if (this.stateManager.isState(FaceDetectionState.READY)) {
        this.stateManager.setState(FaceDetectionState.INITIAL);
        this.isReadyTransitionStarted = false; // 플래그 리셋
      }

      // 수집된 데이터 초기화
      this.measurementManager.resetData();

      // 얼굴이 원 밖에 있다는 에러 콜백 호출
      this.eventManager.emitError(new Error('원 안에 얼굴을 위치해주세요.'), 'FACE_OUT_OF_CIRCLE');

      return;
    }

    // 얼굴 영역에서 RGB 데이터 추출 (measuring 상태일 때만)
    if (this.stateManager.isState(FaceDetectionState.MEASURING)) {
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      const faceRegion = this.ctx.getImageData(0, 0, width, height);
      this.workerManager.postFaceRegionData(faceRegion);
    }
  }

  // ready 상태에서 measuring 상태로 전환하는 비동기 함수
  private async startReadyToMeasuringTransition(): Promise<void> {
    await this.measurementManager.startReadyToMeasuringTransition(
      () => this.stateManager.isState(FaceDetectionState.READY),
      () => this.isFaceDetectiveActive,
      () => this.isFaceInCircle,
      (state: string) => this.stateManager.setState(state as FaceDetectionState),
    );
  }

  // 얼굴 인식 실패 시 처리
  private handleNoDetection(): void {
    // 얼굴 감지 상태 콜백 호출
    this.eventManager.emitFaceDetectionChange(false, null);

    // 얼굴이 감지되지 않으면 원 안에 있지 않다고 설정
    if (this.isFaceInCircle) {
      this.isFaceInCircle = false;
      this.eventManager.emitFacePositionChange(false);
    }

    // ready 상태였다면 initial로 되돌림
    if (this.stateManager.isState(FaceDetectionState.READY)) {
      this.stateManager.setState(FaceDetectionState.INITIAL);
      this.isReadyTransitionStarted = false; // 플래그 리셋
    }

    // 수집된 데이터 초기화 (얼굴이 인식되지 않으면 데이터 수집 중단)
    this.measurementManager.resetData();

    // 얼굴 인식 실패 에러 콜백 호출 (상태 변경 없음)
    this.eventManager.emitError(
      new Error('얼굴을 인식할 수 없습니다. 조명이 충분한 곳에서 다시 시도해주세요.'),
      'FACE_NOT_DETECTED',
    );
  }

  // 얼굴 인식 종료 시 처리
  public stopDetection(): void {
    if (!this.isFaceDetectiveActive) return;

    this.isFaceDetectiveActive = false;
    this.webcamManager.stopWebcam();

    this.workerManager.terminate();

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

      // 웹캠 스트림 시작
      const webcamStream = await this.webcamManager.startWebcam();
      this.video.srcObject = webcamStream;
      this.video.play();

      this.video.addEventListener('loadeddata', () => {
        let lastFrameTime = 0;
        let frameCount = 0;

        const processVideo = async (): Promise<void> => {
          if (!this.isFaceDetectiveActive || this.video.readyState < 3) return;
          const now = performance.now();
          const elapsed = now - lastFrameTime;
          const frameInterval = this.configManager.getConfig().measurement?.frameInterval || 33.33;
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
              this.configManager.getConfig().measurement?.frameProcessInterval || 30;
            if (frameCount % frameProcessInterval === 0) {
              await this.mediapipeManager.sendImage(this.video);
            } else if (this.lastBoundingBox && this.isFaceInCircle) {
              const { left, top, width, height } = this.lastBoundingBox;
              const faceRegion = this.videoCtx.getImageData(left, top, width, height);
              this.workerManager.postFaceRegionData(faceRegion);
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
    const isIOS = this.configManager.getConfig().platform?.isIOS || false;
    this.eventManager.emitWebcamError(err, isIOS);
  }

  // 상태 관리 메서드들

  /**
   * 현재 상태를 반환합니다.
   */
  public getCurrentState(): FaceDetectionState {
    return this.stateManager.getCurrentState();
  }

  /**
   * 상태 변경 콜백을 등록합니다.
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.stateManager.onStateChange(callback);
  }

  /**
   * 상태 변경 콜백을 제거합니다.
   */
  public removeStateChangeCallback(callback: StateChangeCallback): void {
    this.stateManager.removeStateChangeCallback(callback);
  }

  /**
   * 특정 상태인지 확인합니다.
   */
  public isState(state: FaceDetectionState): boolean {
    return this.stateManager.isState(state);
  }

  /**
   * 여러 상태 중 하나인지 확인합니다.
   */
  public isAnyState(...states: FaceDetectionState[]): boolean {
    return this.stateManager.isAnyState(...states);
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
   * HTML 요소들 초기화 (외부에서 호출 가능)
   */
  public async initializeElements(): Promise<void> {
    const config = this.configManager.getConfig();
    if (!config.elements) {
      throw new Error(
        'HTML 요소들이 config에 제공되지 않았습니다. config.elements를 설정해주세요.',
      );
    }

    this.video = config.elements.video;
    this.canvasElement = config.elements.canvasElement;
    this.videoCanvas = config.elements.videoCanvas;
    this.container = config.elements.container;

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
    const config = this.configManager.getConfig();
    await this.mediapipeManager.initialize(config.faceDetection?.minDetectionConfidence || 0.5);
    this.setupFaceDetection();
  }
}

// 기존 코드와의 호환성을 위한 별칭
export const FaceDetectionCore = FaceDetectionSDK;

// 기본 내보내기
export default FaceDetectionSDK;
