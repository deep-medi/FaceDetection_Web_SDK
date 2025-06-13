// 외부 라이브러리 및 모듈 임포트

import { updatePositionErrors } from '../utils/facePosition.ts';
import { processResults } from '../utils/faceDetectionProcessor.ts';
import { processFaceRegionData } from '../utils/faceRegionWorker.ts';
import { createDataString } from '../utils/dataProcessing.ts';
import { checkFacePosition } from '../utils/facePositionUtils.ts';
import { handleDataDownload } from '../utils/downloadUtils.ts';
import { waitSeconds } from '../utils/waitSeconds.ts';
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
import packageJson from '../../package.json';

export class FaceDetectionSDK {
  // SDK 버전 정보
  public static readonly VERSION = packageJson.version;

  // SDK 설정
  private configManager: ConfigManager;
  private eventManager: EventManager;
  private mediapipeManager: MediapipeManager;

  // 상태 관리
  private currentState: FaceDetectionState = FaceDetectionState.INITIAL;

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
    // ConfigManager 초기화
    this.configManager = new ConfigManager(config);

    // EventManager 초기화
    this.eventManager = new EventManager(callbacks, this.log.bind(this));

    // MediapipeManager 초기화
    this.mediapipeManager = new MediapipeManager();

    // 플랫폼별 다운로드 함수 설정
    this.downloadRgbData = this.createDownloadFunction();

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
          enabled: config.dataDownload.enabled!,
          autoDownload: config.dataDownload.autoDownload!,
          filename: config.dataDownload.filename!,
        },
        {
          isAndroid: config.platform.isAndroid,
          isIOS: config.platform.isIOS,
        },
        this.log.bind(this),
      );
    };
  }

  /**
   * 디버그 로그
   */
  private log(message: string, ...args: any[]): void {
    const config = this.configManager.getConfig();
    if (config.debug.enableConsoleLog) {
      console.log(`[FaceDetectionSDK] ${message}`, ...args);
    }
  }

  /**
   * 오류 처리
   */
  private handleError(error: Error, context?: string): void {
    this.eventManager.emitError(error, context);
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

      if (this.timingHist.length > this.configManager.getConfig().measurement.targetDataPoints!) {
        const excess =
          this.timingHist.length - this.configManager.getConfig().measurement.targetDataPoints!;

        this.mean_red.splice(0, excess);
        this.mean_green.splice(0, excess);
        this.mean_blue.splice(0, excess);
        this.timingHist.splice(0, excess);
      }

      // 데이터 수집 시마다 진행률 계산
      if (this.timingHist.length > 0) {
        // 데이터 개수 기준으로 진행률 계산 (목표 데이터 개수 기준)
        const progress = Math.min(
          this.timingHist.length / this.configManager.getConfig().measurement.targetDataPoints!,
          1.0,
        );

        // 진행률 콜백 호출
        this.eventManager.emitProgress(progress, this.timingHist.length);

        // 정확히 목표 데이터 개수에 도달했을 때 결과 처리
        if (
          this.timingHist.length === this.configManager.getConfig().measurement.targetDataPoints!
        ) {
          this.finalizeMeasurement();
        }
      }
    };
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
        FACE_DETECTION_TIMEOUT: this.configManager.getConfig().faceDetection.timeout!,
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
    this.eventManager.emitFaceDetectionChange(true, this.lastBoundingBox);

    const { boundingBox } = detection; // 바운딩 박스 추출
    const faceX = boundingBox.xCenter * this.video.videoWidth; // 얼굴 위치 x 좌표
    const faceY = boundingBox.yCenter * this.video.videoHeight; // 얼굴 위치 y 좌표

    // 얼굴 위치 체크
    const { isInCircle } = checkFacePosition(faceX, faceY, this.video, this.container);

    // 얼굴 위치 상태 업데이트
    if (this.isFaceInCircle !== isInCircle) {
      this.isFaceInCircle = isInCircle;
      this.eventManager.emitFacePositionChange(isInCircle);
    }

    // 얼굴이 원 안에 들어왔을 때 initial 상태라면 ready 상태로 전환
    if (this.isState(FaceDetectionState.INITIAL) && !this.isReadyTransitionStarted && isInCircle) {
      this.isReadyTransitionStarted = true;
      this.setState(FaceDetectionState.READY);

      // 카운트다운 시작
      this.startReadyToMeasuringTransition();
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
      this.configManager.getConfig().errorBounding || 4,
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
      this.eventManager.emitError(new Error('원 안에 얼굴을 위치해주세요.'), 'FACE_OUT_OF_CIRCLE');

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
      const delaySeconds = this.configManager.getConfig().measurement.readyToMeasuringDelay!;

      // 1초씩 카운트다운
      for (let remaining = delaySeconds; remaining > 0; remaining--) {
        this.log(`측정 시작까지 ${remaining}초 남았습니다...`);
        await waitSeconds(1);

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
    this.eventManager.emitMeasurementComplete(this.measurementResult);

    // RGB 데이터 다운로드 (플랫폼별 함수 사용)
    this.downloadRgbData(dataString);

    return dataString;
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
    this.eventManager.emitError(
      new Error('얼굴을 인식할 수 없습니다. 조명이 충분한 곳에서 다시 시도해주세요.'),
      'FACE_NOT_DETECTED',
    );
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
        width: this.configManager.getConfig().video.width,
        height: this.configManager.getConfig().video.height,
        frameRate: this.configManager.getConfig().video.frameRate,
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
          if (elapsed > this.configManager.getConfig().measurement.frameInterval!) {
            lastFrameTime =
              now - (elapsed % this.configManager.getConfig().measurement.frameInterval!);
            frameCount++;

            this.videoCtx.drawImage(
              this.video,
              0,
              0,
              this.videoCanvas.width,
              this.videoCanvas.height,
            );

            if (
              frameCount % this.configManager.getConfig().measurement.frameProcessInterval! ===
              0
            ) {
              await this.mediapipeManager.sendImage(this.video);
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
    const isIOS = this.configManager.getConfig().platform.isIOS || false;
    this.eventManager.emitWebcamError(err, isIOS);
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
    this.eventManager.emitStateChange(newState, previousState);
  }

  /**
   * 상태 변경 콜백을 등록합니다.
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.eventManager.onStateChange(callback);
  }

  /**
   * 상태 변경 콜백을 제거합니다.
   */
  public removeStateChangeCallback(callback: StateChangeCallback): void {
    this.eventManager.removeStateChangeCallback(callback);
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
    await this.mediapipeManager.initialize(config.faceDetection.minDetectionConfidence);
    this.setupFaceDetection();
  }

  /**
   * 워커 초기화
   */
  private initializeWorker(): void {
    const workerUrl = new URL('../workers/faceRegionWorker.js', import.meta.url);
    this.faceRegionWorker = new Worker(workerUrl, {
      type: 'module',
    });

    this.lastRGB = { timestamp: 0, r: null, g: null, b: null };
    this.setupWorker();
  }
}

// 기존 코드와의 호환성을 위한 별칭
export const FaceDetectionCore = FaceDetectionSDK;

// 기본 내보내기
export default FaceDetectionSDK;
