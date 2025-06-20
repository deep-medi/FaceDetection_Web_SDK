import { FaceDetectionSDKConfig, MeasurementResult, LastRGB } from '../../types/index.js';
import { createDataString } from '../../utils/dataProcessing.ts';
import { waitSeconds } from '../../utils/waitSeconds.ts';

// 이벤트 인터페이스 정의
export interface MeasurementEvents {
  onProgress: (progress: number, dataLength: number) => void;
  onMeasurementComplete: (result: MeasurementResult) => void;
  onDataDownload: (dataString: string) => void;
  onLog: (msg: string) => void;
  onCountdown: (remainingSeconds: number, totalSeconds: number) => void;
}

export class MeasurementManager {
  private red: number[] = [];
  private green: number[] = [];
  private blue: number[] = [];
  private timestamps: number[] = [];
  private isCompleted = false;
  private isCountdownActive = false;

  constructor(
    private config: FaceDetectionSDKConfig,
    private events: MeasurementEvents,
  ) {}

  /**
   * RGB 데이터를 추가합니다.
   */
  public addRGBData({ r, g, b, timestamp }: LastRGB): void {
    if (this.isCompleted || r == null || g == null || b == null) return;

    this.red.push(r);
    this.green.push(g);
    this.blue.push(b);
    this.timestamps.push(timestamp);

    // 데이터 개수 제한
    const max = this.config.measurement?.targetDataPoints ?? 450;
    if (this.timestamps.length > max) {
      const excess = this.timestamps.length - max;
      this.red.splice(0, excess);
      this.green.splice(0, excess);
      this.blue.splice(0, excess);
      this.timestamps.splice(0, excess);
    }

    // 진행률 계산 및 콜백 호출
    this.events.onProgress(Math.min(this.timestamps.length / max, 1), this.timestamps.length);

    // 목표 데이터 개수에 도달했을 때 결과 처리
    if (this.timestamps.length === max) this.finalize();
  }

  /**
   * 측정을 완료합니다.
   */
  private finalize(): void {
    this.isCompleted = true;
    const dataString = createDataString(this.red, this.green, this.blue, this.timestamps);

    // 측정 결과 생성
    const measurementResult: MeasurementResult = {
      rawData: {
        sigR: this.red,
        sigG: this.green,
        sigB: this.blue,
        timestamp: this.timestamps,
      },
      quality: {
        positionError: 0, // FacePositionManager에서 가져와야 함
        yPositionError: 0, // FacePositionManager에서 가져와야 함
        dataPoints: this.timestamps.length,
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
    this.red = [];
    this.green = [];
    this.blue = [];
    this.timestamps = [];
    this.isCompleted = this.isCountdownActive = false;
  }

  /**
   * 카운트다운을 중단합니다.
   */
  public stopCountdown(): void {
    this.isCountdownActive = false;
    this.events.onLog('카운트다운이 사용자에 의해 중단되었습니다.');
  }

  /**
   * 카운트다운이 활성화되어 있는지 확인합니다.
   */
  public isCountdownRunning(): boolean {
    return this.isCountdownActive;
  }

  /**
   * ready 상태에서 measuring 상태로 전환하는 카운트다운을 시작합니다.
   */
  public async startReadyToMeasuringTransition(
    isReady: () => boolean,
    isDetectiveOn: () => boolean,
    isFaceIn: () => boolean,
    changeState: (state: string) => void,
  ): Promise<void> {
    const total = this.config.measurement?.readyToMeasuringDelay ?? 3;
    this.isCountdownActive = true;

    // 카운트다운 시작 알림
    this.events.onCountdown(total, total);
    this.events.onLog(`측정 시작까지 ${total}초 남았습니다...`);

    try {
      for (let i = total - 1; i > 0; i--) {
        await waitSeconds(1);
        if (!this.isCountdownActive) return;

        // 카운트다운 업데이트
        this.events.onCountdown(i, total);
        this.events.onLog(`측정 시작까지 ${i}초 남았습니다...`);
      }

      // 카운트다운 완료
      this.isCountdownActive = false;

      // 여전히 ready 상태이고 얼굴 인식이 활성화되어 있고 얼굴이 원 안에 있다면 measuring으로 전환
      if (isReady() && isDetectiveOn() && isFaceIn()) {
        changeState('measuring');
      }
    } catch (e) {
      this.isCountdownActive = false;
      this.events.onLog('Ready to measuring 상태 전환 중 오류: ' + e);
    }
  }
}
