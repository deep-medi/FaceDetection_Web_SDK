// 외부 라이브러리 및 모듈 임포트
import {
  Managers,
  processResults,
  handleDataDownload,
  CalculatedBoundingBox,
  Detection,
  FaceDetectionSDKConfig,
  FaceDetectionState,
  MeasurementResult,
  SDKEventCallbacks,
  FaceDetectionErrorType,
} from './index';
import { extractRGBFromCircleRegion } from '../utils/circleRegionUtils';
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
  private readonly measurementManager: Managers.MeasurementManager;

  // 상태 플래그들
  private isFaceDetectiveActive = false;
  private isFaceInCircle = false;
  private isReadyTransitionStarted = false;
  private isInitialized = false;

  // HTML 요소들
  private video!: HTMLVideoElement;
  private videoCanvas!: HTMLCanvasElement;
  private videoCtx!: CanvasRenderingContext2D;
  private container!: HTMLElement;

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

    this.measurementManager = new Managers.MeasurementManager(this.configManager.getConfig(), {
      onProgress: this.eventManager.emitProgress.bind(this.eventManager),
      onMeasurementComplete: this.handleMeasurementComplete.bind(this),
      onDataDownload: this.createDownloadFunction(),
      onLog: (msg: string) => this.log(msg),
      onCountdown: (remainingSeconds: number, totalSeconds: number) => {
        this.eventManager.emitCountdown(remainingSeconds, totalSeconds);
      },
    });

    // 상태 변경 시 EventManager를 통해 콜백 호출
    this.stateManager.setStateChangeCallback((newState, previousState) => {
      this.eventManager.emitStateChange(newState, previousState);
    });

    this.log(`SDK 인스턴스가 생성되었습니다. (v${FaceDetectionSDK.VERSION})`);
  }

  // SDK 완전 초기화 및 측정 시작
  public async initializeAndStart(): Promise<void> {
    try {
      this.log('SDK 완전 초기화를 시작합니다...');

      await this.initializeElements();
      if (!this.isInitialized) {
        await this.initializeMediaPipe();
        this.isInitialized = true;
        this.log('SDK 초기화가 완료되었습니다.');
      }
      await this.handleClickStart();

      this.log('SDK 초기화 및 측정 시작이 완료되었습니다.');
    } catch (error) {
      this.eventManager.emitError(
        error as Error,
        FaceDetectionErrorType.INITIALIZATION_FAILED,
        'SDK 완전 초기화 중 오류',
      );
      throw error;
    }
  }

  // SDK 정리
  public dispose(): void {
    this.stopDetection();
    this.webcamManager.dispose();
    this.mediapipeManager.dispose();
    this.eventManager.dispose();
    this.isInitialized = false;
    this.log('SDK가 정리되었습니다.');
  }

  // ===== Private Event Handlers =====

  // 플랫폼별 다운로드 함수 생성
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

  // 측정 완료 콜백 핸들러
  private handleMeasurementComplete(result: MeasurementResult): void {
    const { positionErr, yPositionErr } = this.facePositionManager.getPositionErrors();
    this.stateManager.setState(FaceDetectionState.COMPLETED);
    this.isFaceDetectiveActive = false;
    this.eventManager.emitMeasurementComplete({
      ...result,
      quality: {
        ...result.quality,
        positionError: positionErr,
        yPositionError: yPositionErr,
        dataPoints: result.quality?.dataPoints || 0,
      },
    });
  }

  // 얼굴 인식 설정
  private setupFaceDetection(): void {
    this.mediapipeManager.setOnResultsCallback((results: any) => {
      const noDetections = !results.detections || results.detections.length === 0;

      if (noDetections) {
        this.handleNoFaceDetected();
        return;
      }

      const config = this.configManager.getConfig();
      const result = processResults(results, {
        isFirstFrame: this.isFirstFrame,
        isFaceDetected: this.isFaceDetected,
        faceDetectionTimer: this.faceDetectionTimer,
        FACE_DETECTION_TIMEOUT: config.faceDetection?.timeout ?? DEFAULT_FACE_DETECTION_TIMEOUT,
        handleFaceDetection: this.handleFaceDetection.bind(this),
        handleNoDetection: () => {},
        mean_red: [],
      });

      this.isFirstFrame = result.isFirstFrame;
      this.isFaceDetected = result.isFaceDetected;
      this.faceDetectionTimer = result.faceDetectionTimer;
      this.lastBoundingBox = result.lastBoundingBox;
    });
  }

  private handleNoFaceDetected(): void {
    this.eventManager.emitFaceDetectionChange(false, null);
    this.isFaceInCircle = false;
    this.eventManager.emitFacePositionChange(false);
    this.measurementManager.resetData();
    this.eventManager.emitError(
      new Error('얼굴을 인식할 수 없습니다. 조명이 충분한 곳에서 다시 시도해주세요.'),
      FaceDetectionErrorType.FACE_NOT_DETECTED,
    );
  }

  // 얼굴 인식 처리
  private handleFaceDetection(detection: Detection): void {
    this.eventManager.emitFaceDetectionChange(true, this.lastBoundingBox);

    const { isInCircle } = this.facePositionManager.updateFacePosition(
      detection.boundingBox,
      this.video,
      this.container,
    );

    // 얼굴 위치 상태 변경 시 이벤트 발생
    if (this.isFaceInCircle !== isInCircle) {
      this.isFaceInCircle = isInCircle;
      this.eventManager.emitFacePositionChange(isInCircle);
    }

    // 초기 상태에서 원 안에 얼굴이 들어오면 READY 상태로 전환
    if (
      this.stateManager.isState(FaceDetectionState.INITIAL) &&
      !this.isReadyTransitionStarted &&
      isInCircle
    ) {
      this.isReadyTransitionStarted = true;
      this.stateManager.setState(FaceDetectionState.READY);
      this.startReadyToMeasuringTransition();
    }

    // 얼굴이 원 밖에 있을 때 처리
    if (!isInCircle) {
      this.handleFaceOutOfCircle();
      return;
    }
  }

  private handleFaceOutOfCircle(): void {
    if (this.stateManager.isState(FaceDetectionState.READY)) {
      this.stateManager.setState(FaceDetectionState.INITIAL);
      this.isReadyTransitionStarted = false;
    }
    this.measurementManager.resetData();
    this.eventManager.emitError(
      new Error('원 안에 얼굴을 위치해주세요.'),
      FaceDetectionErrorType.FACE_OUT_OF_CIRCLE,
    );
  }

  // 얼굴 측정 시작
  private async handleClickStart(): Promise<void> {
    try {
      await this.initializeDetectionState();
      const webcamStream = await this.webcamManager.startWebcam();
      await this.setupVideoStream(webcamStream);
      this.startVideoProcessing();
    } catch (err) {
      this.handleWebcamError(err as Error);
    }
  }

  // 얼굴 인식 상태 초기화
  private async initializeDetectionState(): Promise<void> {
    this.isFaceDetectiveActive = true;
    this.isFaceDetected = false;
    this.isFirstFrame = true;
    this.isFaceInCircle = false;
    this.isReadyTransitionStarted = false;
  }

  // 비디오 스트림 설정
  private async setupVideoStream(webcamStream: MediaStream): Promise<void> {
    this.video.srcObject = webcamStream;
    this.video.play();
  }

  // 비디오 처리 시작
  private startVideoProcessing(): void {
    this.video.addEventListener('loadeddata', () => {
      this.initializeVideoProcessor();
    });
  }

  // 비디오 프로세서 초기화 및 프레임 처리 루프 시작
  private initializeVideoProcessor(): void {
    let lastFrameTime = 0;
    let frameCount = 0;

    const processVideo = async (): Promise<void> => {
      if (!this.isFaceDetectiveActive || this.video.readyState < VIDEO_READY_STATE) return;

      const now = performance.now();
      const elapsed = now - lastFrameTime;
      const frameInterval =
        this.configManager.getConfig().measurement?.frameInterval || DEFAULT_FRAME_INTERVAL;

      if (elapsed > frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval);
        frameCount++;

        // 비디오 프레임을 캔버스에 그리기
        this.videoCtx.drawImage(this.video, 0, 0, this.videoCanvas.width, this.videoCanvas.height);

        // 프레임 데이터 처리
        const frameProcessInterval =
          this.configManager.getConfig().measurement?.frameProcessInterval ||
          DEFAULT_FRAME_PROCESS_INTERVAL;

        if (frameCount % frameProcessInterval === 0) {
          await this.mediapipeManager.sendImage(this.video);
        } else if (this.isFaceInCircle) {
          // 원형 영역에서 RGB 데이터 추출
          const rgbData = extractRGBFromCircleRegion(this.videoCtx, this.container, this.video);
          this.measurementManager.addRGBData(rgbData);
        }
      }

      requestAnimationFrame(processVideo);
    };

    requestAnimationFrame(processVideo);
  }

  // 웹캠 에러 처리
  private handleWebcamError(err: Error): void {
    const isIOS = this.configManager.getConfig().platform?.isIOS || false;
    this.eventManager.emitWebcamError(err, isIOS);
  }

  // ===== Private Helper Methods =====

  // Ready 상태에서 Measuring 상태로 전환
  private async startReadyToMeasuringTransition(): Promise<void> {
    await this.measurementManager.startReadyToMeasuringTransition(
      () => this.stateManager.isState(FaceDetectionState.READY),
      () => this.isFaceDetectiveActive,
      () => this.isFaceInCircle,
      (state: string) => this.stateManager.setState(state as FaceDetectionState),
    );
  }

  // 디버그 로그
  private log(message: string, ...args: any[]): void {
    const config = this.configManager.getConfig();
    if (config.debug?.enableConsoleLog) {
      console.log(`[FaceDetectionSDK] ${message}`, ...args);
    }
  }

  // 얼굴 인식 종료 시 처리
  private stopDetection(): void {
    if (!this.isFaceDetectiveActive) return;

    this.isFaceDetectiveActive = false;
    this.webcamManager.stopWebcam();
    if (this.faceDetectionTimer) {
      clearTimeout(this.faceDetectionTimer);
      this.faceDetectionTimer = null;
    }
  }

  // 상태 관리 메서드들

  // 현재 상태를 반환
  public getCurrentState(): FaceDetectionState {
    return this.stateManager.getCurrentState();
  }

  // 특정 상태인지 확인
  public isState(state: FaceDetectionState): boolean {
    return this.stateManager.isState(state);
  }

  // 여러 상태 중 하나인지 확인
  public isAnyState(...states: FaceDetectionState[]): boolean {
    return this.stateManager.isAnyState(...states);
  }

  // 얼굴이 원 안에 있는지 확인
  public isFaceInsideCircle(): boolean {
    return this.isFaceInCircle;
  }

  // ===== 초기화 메서드들 =====

  // HTML 요소들 초기화
  private async initializeElements(): Promise<void> {
    const config = this.configManager.getConfig();

    if (!config.elements) {
      throw new Error(
        'HTML 요소들이 config에 제공되지 않았습니다. config.elements를 설정해주세요.',
      );
    }

    this.video = config.elements.video;
    this.videoCanvas = config.elements.videoCanvas;
    this.container = config.elements.container;
    const videoCtx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
    if (!videoCtx) throw new Error('Video canvas context를 가져올 수 없습니다.');
    this.videoCtx = videoCtx;
  }

  // MediaPipe 초기화
  private async initializeMediaPipe(): Promise<void> {
    const config = this.configManager.getConfig();
    await this.mediapipeManager.initialize(config.faceDetection?.minDetectionConfidence || 0.5);
    this.setupFaceDetection();
  }
}

export default FaceDetectionSDK;
