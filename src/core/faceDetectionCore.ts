// 외부 라이브러리 및 모듈 임포트
import {
  Managers,
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
import packageJson from '../../package.json';

// 상수 정의
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

  // Manager 인스턴스들
  private readonly configManager: Managers.ConfigManager;
  private readonly eventManager: Managers.EventManager;
  private readonly mediapipeManager: Managers.MediapipeManager;
  private readonly stateManager: Managers.StateManager;
  private readonly webcamManager: Managers.WebcamManager;
  private readonly facePositionManager: Managers.FacePositionManager;
  private readonly workerManager: Managers.WorkerManager;
  private readonly measurementManager: Managers.MeasurementManager;

  // 상태 플래그들
  private isFaceDetectiveActive = false;
  private isFaceInCircle = false;
  private isReadyTransitionStarted = false;
  private isInitialized = false;

  // HTML 요소들
  private video!: HTMLVideoElement;
  private canvasElement!: HTMLCanvasElement;
  private videoCanvas!: HTMLCanvasElement;
  private videoCtx!: CanvasRenderingContext2D;
  private container!: HTMLElement;
  private ctx!: CanvasRenderingContext2D;

  // 얼굴 인식 관련 상태
  private lastBoundingBox: CalculatedBoundingBox | null = null;
  private faceDetectionTimer: NodeJS.Timeout | null = null;
  private isFaceDetected = false;
  private isFirstFrame = true;

  /**
   * FaceDetectionSDK 생성자
   * @param config SDK 설정 객체
   * @param callbacks 이벤트 콜백 객체
   */
  constructor(config: FaceDetectionSDKConfig = {}, callbacks: SDKEventCallbacks = {}) {
    this.configManager = new Managers.ConfigManager(config);
    this.eventManager = new Managers.EventManager(callbacks);
    this.stateManager = new Managers.StateManager();
    this.mediapipeManager = new Managers.MediapipeManager();

    this.webcamManager = new Managers.WebcamManager(this.configManager.getConfig(), {
      onWebcamError: this.handleWebcamError.bind(this),
    });

    this.facePositionManager = new Managers.FacePositionManager(
      this.configManager.getConfig().errorBounding || DEFAULT_ERROR_BOUNDING,
    );

    this.workerManager = new Managers.WorkerManager({
      onDataProcessed: this.handleWorkerData.bind(this),
    });

    this.measurementManager = new Managers.MeasurementManager(this.configManager.getConfig(), {
      onProgress: this.eventManager.emitProgress.bind(this.eventManager),
      onMeasurementComplete: this.handleMeasurementComplete.bind(this),
      onDataDownload: this.createDownloadFunction(),
      onLog: (msg: string) => this.log(msg),
    });

    this.setupStateChangeHandler();
    this.log(`SDK 인스턴스가 생성되었습니다. (v${FaceDetectionSDK.VERSION})`);
  }

  /**
   * SDK 완전 초기화 및 측정 시작
   * HTML 요소 초기화, MediaPipe 설정, 워커 초기화, 측정 시작을 한 번에 수행합니다.
   */
  public async initializeAndStart(): Promise<void> {
    try {
      this.log('SDK 완전 초기화를 시작합니다...');

      await this.initializeElements();
      await this.initializeSDK();
      await this.startMeasurement();

      this.log('SDK 초기화 및 측정 시작이 완료되었습니다.');
    } catch (error) {
      this.handleError(error as Error, 'SDK 완전 초기화 중 오류가 발생했습니다.');
      throw error;
    }
  }

  /**
   * SDK 정리
   * 리소스를 해제하고 이벤트 리스너를 제거합니다.
   */
  public dispose(): void {
    this.stopDetection();
    this.cleanupResources();
    this.resetState();
    this.log('SDK가 정리되었습니다.');
  }

  // ===== Private Event Handlers =====

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
    const patchedResult = this.patchMeasurementResult(result);
    this.completeMeasurement(patchedResult);
  }

  /**
   * 워커 데이터 처리 핸들러
   */
  private handleWorkerData(data: any): LastRGB {
    if (!this.shouldCollectData()) {
      return this.workerManager.getLastRGB();
    }

    const lastRGB = this.processFaceRegionData(data);
    this.measurementManager.addRGBData(lastRGB);
    return lastRGB;
  }

  /**
   * 얼굴 인식 설정
   */
  private setupFaceDetection(): void {
    this.mediapipeManager.setOnResultsCallback((results: any) => {
      if (this.hasNoDetections(results)) {
        this.handleNoDetection();
        return;
      }

      this.processDetectionResults(results);
    });
  }

  /**
   * 얼굴 인식 처리
   */
  private handleFaceDetection(detection: Detection): void {
    this.emitFaceDetectionSuccess();
    this.updateFacePosition(detection);
    this.handleFacePositionChange();
    this.handleFaceOutOfCircle();
    this.collectRGBDataIfMeasuring();
  }

  /**
   * 얼굴 인식 실패 시 처리
   */
  private handleNoDetection(): void {
    this.emitFaceDetectionFailure();
    this.resetFacePositionState();
    this.resetReadyState();
    this.resetMeasurementData();
    this.emitFaceNotDetectedError();
  }

  /**
   * 얼굴 측정 시작
   */
  public async handleClickStart(): Promise<void> {
    try {
      this.initializeDetectionState();
      await this.startWebcamStream();
      this.setupVideoProcessing();
    } catch (err) {
      this.handleWebcamError(err as Error);
    }
  }

  /**
   * 웹캠 에러 처리
   */
  private handleWebcamError(err: Error): void {
    const isIOS = this.configManager.getConfig().platform?.isIOS || false;
    this.eventManager.emitWebcamError(err, isIOS);
  }

  // ===== Private Helper Methods =====

  /**
   * 측정 결과에 에러 정보 추가
   */
  private patchMeasurementResult(result: MeasurementResult): MeasurementResult {
    const { positionErr, yPositionErr } = this.facePositionManager.getPositionErrors();
    return {
      ...result,
      quality: {
        ...result.quality,
        positionError: positionErr,
        yPositionError: yPositionErr,
        dataPoints: result.quality?.dataPoints || 0,
      },
    };
  }

  /**
   * 측정 완료 처리
   */
  private completeMeasurement(result: MeasurementResult): void {
    this.stateManager.setState(FaceDetectionState.COMPLETED);
    this.isFaceDetectiveActive = false;
    this.eventManager.emitMeasurementComplete(result);
  }

  /**
   * 데이터 수집 여부 확인
   */
  private shouldCollectData(): boolean {
    return (
      this.stateManager.isState(FaceDetectionState.MEASURING) &&
      !this.stateManager.isState(FaceDetectionState.COMPLETED)
    );
  }

  /**
   * 얼굴 영역 데이터 처리
   */
  private processFaceRegionData(data: any): LastRGB {
    return processFaceRegionData(
      data,
      [], // mean_red, mean_green, mean_blue는 MeasurementManager에서 관리
      [], // mean_green
      [], // mean_blue
      [], // timingHist
      this.workerManager.getLastRGB(),
    );
  }

  /**
   * 얼굴 감지 결과 확인
   */
  private hasNoDetections(results: any): boolean {
    return !results.detections || results.detections.length === 0;
  }

  /**
   * 얼굴 감지 결과 처리
   */
  private processDetectionResults(results: any): void {
    const config = this.configManager.getConfig();
    const result = processResults(results, {
      isFirstFrame: this.isFirstFrame,
      isFaceDetected: this.isFaceDetected,
      faceDetectionTimer: this.faceDetectionTimer,
      FACE_DETECTION_TIMEOUT: config.faceDetection?.timeout || DEFAULT_FACE_DETECTION_TIMEOUT,
      handleFaceDetection: this.handleFaceDetection.bind(this),
      handleNoDetection: this.handleNoDetection.bind(this),
      mean_red: [], // MeasurementManager에서 관리
    });

    this.updateDetectionState(result);
  }

  /**
   * 얼굴 감지 상태 업데이트
   */
  private updateDetectionState(result: any): void {
    this.isFirstFrame = result.isFirstFrame;
    this.isFaceDetected = result.isFaceDetected;
    this.faceDetectionTimer = result.faceDetectionTimer;
    this.lastBoundingBox = result.lastBoundingBox;
  }

  /**
   * 얼굴 감지 성공 이벤트 발생
   */
  private emitFaceDetectionSuccess(): void {
    this.eventManager.emitFaceDetectionChange(true, this.lastBoundingBox);
  }

  /**
   * 얼굴 위치 업데이트
   */
  private updateFacePosition(detection: Detection): void {
    const { isInCircle } = this.facePositionManager.updateFacePosition(
      detection.boundingBox,
      this.video,
      this.container,
    );

    if (this.isFaceInCircle !== isInCircle) {
      this.isFaceInCircle = isInCircle;
      this.eventManager.emitFacePositionChange(isInCircle);
    }
  }

  /**
   * 얼굴 위치 변경 처리
   */
  private handleFacePositionChange(): void {
    if (
      this.stateManager.isState(FaceDetectionState.INITIAL) &&
      !this.isReadyTransitionStarted &&
      this.isFaceInCircle
    ) {
      this.transitionToReadyState();
    }
  }

  /**
   * Ready 상태로 전환
   */
  private transitionToReadyState(): void {
    this.isReadyTransitionStarted = true;
    this.stateManager.setState(FaceDetectionState.READY);
    this.startReadyToMeasuringTransition();
  }

  /**
   * 얼굴이 원 밖에 있을 때 처리
   */
  private handleFaceOutOfCircle(): void {
    if (!this.isFaceInCircle) {
      this.resetToInitialState();
      this.resetMeasurementData();
      this.emitFaceOutOfCircleError();
    }
  }

  /**
   * 초기 상태로 리셋
   */
  private resetToInitialState(): void {
    if (this.stateManager.isState(FaceDetectionState.READY)) {
      this.stateManager.setState(FaceDetectionState.INITIAL);
      this.isReadyTransitionStarted = false;
    }
  }

  /**
   * 측정 데이터 리셋
   */
  private resetMeasurementData(): void {
    this.measurementManager.resetData();
  }

  /**
   * 얼굴이 원 밖에 있다는 에러 발생
   */
  private emitFaceOutOfCircleError(): void {
    this.eventManager.emitError(new Error('원 안에 얼굴을 위치해주세요.'), 'FACE_OUT_OF_CIRCLE');
  }

  /**
   * RGB 데이터 수집 (measuring 상태일 때만)
   */
  private collectRGBDataIfMeasuring(): void {
    if (this.stateManager.isState(FaceDetectionState.MEASURING)) {
      const faceRegion = this.extractFaceRegion();
      this.workerManager.postFaceRegionData(faceRegion);
    }
  }

  /**
   * 얼굴 영역 추출
   */
  private extractFaceRegion(): ImageData {
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    return this.ctx.getImageData(0, 0, width, height);
  }

  /**
   * 얼굴 감지 실패 이벤트 발생
   */
  private emitFaceDetectionFailure(): void {
    this.eventManager.emitFaceDetectionChange(false, null);
  }

  /**
   * 얼굴 위치 상태 리셋
   */
  private resetFacePositionState(): void {
    if (this.isFaceInCircle) {
      this.isFaceInCircle = false;
      this.eventManager.emitFacePositionChange(false);
    }
  }

  /**
   * Ready 상태 리셋
   */
  private resetReadyState(): void {
    if (this.stateManager.isState(FaceDetectionState.READY)) {
      this.stateManager.setState(FaceDetectionState.INITIAL);
      this.isReadyTransitionStarted = false;
    }
  }

  /**
   * 얼굴 인식 실패 에러 발생
   */
  private emitFaceNotDetectedError(): void {
    this.eventManager.emitError(
      new Error('얼굴을 인식할 수 없습니다. 조명이 충분한 곳에서 다시 시도해주세요.'),
      'FACE_NOT_DETECTED',
    );
  }

  /**
   * 감지 상태 초기화
   */
  private initializeDetectionState(): void {
    this.isFaceDetectiveActive = true;
    this.isFaceDetected = false;
    this.isFirstFrame = true;
    this.isFaceInCircle = false;
    this.isReadyTransitionStarted = false;
  }

  /**
   * 웹캠 스트림 시작
   */
  private async startWebcamStream(): Promise<void> {
    const webcamStream = await this.webcamManager.startWebcam();
    this.video.srcObject = webcamStream;
    this.video.play();
  }

  /**
   * 비디오 처리 설정
   */
  private setupVideoProcessing(): void {
    this.video.addEventListener('loadeddata', () => {
      this.startVideoProcessingLoop();
    });
  }

  /**
   * 비디오 처리 루프 시작
   */
  private startVideoProcessingLoop(): void {
    let lastFrameTime = 0;
    let frameCount = 0;

    const processVideo = async (): Promise<void> => {
      if (!this.shouldProcessFrame()) return;

      const now = performance.now();
      const elapsed = now - lastFrameTime;
      const frameInterval = this.getFrameInterval();

      if (elapsed > frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval);
        frameCount++;

        this.drawVideoFrame();
        await this.processFrame(frameCount);
      }

      requestAnimationFrame(processVideo);
    };

    requestAnimationFrame(processVideo);
  }

  /**
   * 프레임 처리 여부 확인
   */
  private shouldProcessFrame(): boolean {
    return this.isFaceDetectiveActive && this.video.readyState >= VIDEO_READY_STATE;
  }

  /**
   * 프레임 간격 가져오기
   */
  private getFrameInterval(): number {
    return this.configManager.getConfig().measurement?.frameInterval || DEFAULT_FRAME_INTERVAL;
  }

  /**
   * 비디오 프레임 그리기
   */
  private drawVideoFrame(): void {
    this.videoCtx.drawImage(this.video, 0, 0, this.videoCanvas.width, this.videoCanvas.height);
  }

  /**
   * 프레임 처리
   */
  private async processFrame(frameCount: number): Promise<void> {
    const frameProcessInterval = this.getFrameProcessInterval();

    if (frameCount % frameProcessInterval === 0) {
      await this.mediapipeManager.sendImage(this.video);
    } else if (this.shouldExtractFaceRegion()) {
      this.extractAndProcessFaceRegion();
    }
  }

  /**
   * 프레임 처리 간격 가져오기
   */
  private getFrameProcessInterval(): number {
    return (
      this.configManager.getConfig().measurement?.frameProcessInterval ||
      DEFAULT_FRAME_PROCESS_INTERVAL
    );
  }

  /**
   * 얼굴 영역 추출 여부 확인
   */
  private shouldExtractFaceRegion(): boolean {
    return this.lastBoundingBox !== null && this.isFaceInCircle;
  }

  /**
   * 얼굴 영역 추출 및 처리
   */
  private extractAndProcessFaceRegion(): void {
    if (!this.lastBoundingBox) return;

    const { left, top, width, height } = this.lastBoundingBox;
    const faceRegion = this.videoCtx.getImageData(left, top, width, height);
    this.workerManager.postFaceRegionData(faceRegion);
  }

  /**
   * Ready 상태에서 Measuring 상태로 전환
   */
  private async startReadyToMeasuringTransition(): Promise<void> {
    await this.measurementManager.startReadyToMeasuringTransition(
      () => this.stateManager.isState(FaceDetectionState.READY),
      () => this.isFaceDetectiveActive,
      () => this.isFaceInCircle,
      (state: string) => this.stateManager.setState(state as FaceDetectionState),
    );
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

  // 얼굴 인식 종료 시 처리
  public stopDetection(): void {
    if (!this.isFaceDetectiveActive) return;

    this.isFaceDetectiveActive = false;
    this.webcamManager.stopWebcam();
    this.workerManager.terminate();
    this.clearFaceDetectionTimer();
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
   * 상태 변경 핸들러 설정
   */
  private setupStateChangeHandler(): void {
    this.stateManager.onStateChange((newState, previousState) => {
      this.eventManager.emitStateChange(newState, previousState);
    });
  }

  /**
   * SDK 초기화
   */
  private async initializeSDK(): Promise<void> {
    if (this.isInitialized) return;

    this.log('SDK 초기화를 시작합니다...');

    await this.initializeMediaPipe();
    this.workerManager.initialize();

    this.isInitialized = true;
    this.log('SDK 초기화가 완료되었습니다.');
  }

  /**
   * HTML 요소들 초기화
   */
  public async initializeElements(): Promise<void> {
    const config = this.configManager.getConfig();

    if (!config.elements) {
      throw new Error(
        'HTML 요소들이 config에 제공되지 않았습니다. config.elements를 설정해주세요.',
      );
    }

    this.assignElements(config.elements);
    this.initializeCanvasContexts();
  }

  /**
   * MediaPipe 초기화
   */
  private async initializeMediaPipe(): Promise<void> {
    const config = this.configManager.getConfig();
    const minDetectionConfidence = config.faceDetection?.minDetectionConfidence || 0.5;

    await this.mediapipeManager.initialize(minDetectionConfidence);
    this.setupFaceDetection();
  }

  /**
   * 측정 시작
   */
  private async startMeasurement(): Promise<void> {
    await this.handleClickStart();
  }

  // ===== Private Helper Methods =====

  /**
   * HTML 요소 할당
   */
  private assignElements(elements: NonNullable<FaceDetectionSDKConfig['elements']>): void {
    this.video = elements.video;
    this.canvasElement = elements.canvasElement;
    this.videoCanvas = elements.videoCanvas;
    this.container = elements.container;
  }

  /**
   * 캔버스 컨텍스트 초기화
   */
  private initializeCanvasContexts(): void {
    const videoCtx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
    if (!videoCtx) throw new Error('Video canvas context를 가져올 수 없습니다.');
    this.videoCtx = videoCtx;

    const ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context를 가져올 수 없습니다.');
    this.ctx = ctx;
  }

  /**
   * 리소스 정리
   */
  private cleanupResources(): void {
    this.workerManager.terminate();
    this.webcamManager.dispose();
    this.mediapipeManager.dispose();
    this.eventManager.dispose();
  }

  /**
   * 상태 초기화
   */
  private resetState(): void {
    this.isInitialized = false;
  }

  /**
   * 얼굴 인식 타이머 정리
   */
  private clearFaceDetectionTimer(): void {
    if (this.faceDetectionTimer) {
      clearTimeout(this.faceDetectionTimer);
      this.faceDetectionTimer = null;
    }
  }
}

// 기존 코드와의 호환성을 위한 별칭
export const FaceDetectionCore = FaceDetectionSDK;

// 기본 내보내기
export default FaceDetectionSDK;
