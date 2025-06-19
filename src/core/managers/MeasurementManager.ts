import { FaceDetectionSDKConfig, MeasurementResult, LastRGB } from '../../types/index.js';
import { createDataString } from '../../utils/dataProcessing.ts';
import { waitSeconds } from '../../utils/waitSeconds.ts';

// 이벤트 인터페이스 정의
export interface MeasurementEvents {
  onProgress: (progress: number, dataLength: number) => void;
  onMeasurementComplete: (result: MeasurementResult) => void;
  onDataDownload: (dataString: string) => void;
  onLog: (msg: string) => void;
}

export class MeasurementManager {
  private mean_red: number[] = [];
  private mean_green: number[] = [];
  private mean_blue: number[] = [];
  private timingHist: number[] = [];
  private config: FaceDetectionSDKConfig;
  private events: MeasurementEvents;
  private isCompleted: boolean = false;

  constructor(config: FaceDetectionSDKConfig, events: MeasurementEvents) {
    this.config = config;
    this.events = events;
  }

  /**
   * RGB 데이터를 추가합니다.
   */
  public addRGBData(lastRGB: LastRGB): void {
    if (this.isCompleted) return;
    if (lastRGB.r !== null && lastRGB.g !== null && lastRGB.b !== null) {
      this.mean_red.push(lastRGB.r);
      this.mean_green.push(lastRGB.g);
      this.mean_blue.push(lastRGB.b);
      this.timingHist.push(lastRGB.timestamp);

      // 데이터 개수 제한
      const targetDataPoints = this.config.measurement?.targetDataPoints || 450;
      if (this.timingHist.length > targetDataPoints) {
        const excess = this.timingHist.length - targetDataPoints;
        this.mean_red.splice(0, excess);
        this.mean_green.splice(0, excess);
        this.mean_blue.splice(0, excess);
        this.timingHist.splice(0, excess);
      }

      // 진행률 계산 및 콜백 호출
      this.updateProgress();

      // 목표 데이터 개수에 도달했을 때 결과 처리
      if (this.timingHist.length === targetDataPoints) {
        this.finalizeMeasurement();
      }
    }
  }

  /**
   * 진행률을 업데이트합니다.
   */
  private updateProgress(): void {
    if (this.timingHist.length > 0) {
      const targetDataPoints = this.config.measurement?.targetDataPoints || 450;
      const progress = Math.min(this.timingHist.length / targetDataPoints, 1.0);
      this.events.onProgress(progress, this.timingHist.length);
    }
  }

  /**
   * 측정을 완료합니다.
   */
  private finalizeMeasurement(): void {
    this.isCompleted = true;
    const dataString = createDataString(
      this.mean_red,
      this.mean_green,
      this.mean_blue,
      this.timingHist,
    );

    // 측정 결과 생성
    const measurementResult: MeasurementResult = {
      rawData: {
        sigR: [...this.mean_red],
        sigG: [...this.mean_green],
        sigB: [...this.mean_blue],
        timestamp: [...this.timingHist].map(Number),
      },
      quality: {
        positionError: 0, // FacePositionManager에서 가져와야 함
        yPositionError: 0, // FacePositionManager에서 가져와야 함
        dataPoints: this.timingHist.length,
      },
    };

    // 측정 완료 콜백 호출
    this.events.onMeasurementComplete(measurementResult);

    // 데이터 다운로드
    this.events.onDataDownload(dataString);
  }

  /**
   * 측정 데이터를 초기화합니다.
   */
  public resetData(): void {
    this.mean_red = [];
    this.mean_green = [];
    this.mean_blue = [];
    this.timingHist = [];
    this.isCompleted = false;
  }

  /**
   * ready 상태에서 measuring 상태로 전환하는 카운트다운을 시작합니다.
   */
  public async startReadyToMeasuringTransition(
    isReadyState: () => boolean,
    isFaceDetectiveActive: () => boolean,
    isFaceInCircle: () => boolean,
    onStateChange: (state: string) => void,
  ): Promise<void> {
    try {
      const delaySeconds = this.config.measurement?.readyToMeasuringDelay || 3;

      // 1초씩 카운트다운
      for (let remaining = delaySeconds; remaining > 0; remaining--) {
        this.events.onLog(`측정 시작까지 ${remaining}초 남았습니다...`);
        await waitSeconds(1);

        // 매 초마다 상태 확인 - 상태가 변경되었거나 얼굴이 원을 벗어났다면 중단
        if (!isReadyState() || !isFaceDetectiveActive() || !isFaceInCircle()) {
          return;
        }
      }

      // 여전히 ready 상태이고 얼굴 인식이 활성화되어 있고 얼굴이 원 안에 있다면 measuring으로 전환
      if (isReadyState() && isFaceDetectiveActive() && isFaceInCircle()) {
        onStateChange('measuring');
      }
    } catch (error) {
      this.events.onLog('Ready to measuring 상태 전환 중 오류: ' + String(error));
    }
  }
}
