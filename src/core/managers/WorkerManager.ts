import { LastRGB } from '../../types/index.js';

// 워커 이벤트 인터페이스 정의
export interface WorkerEvents {
  onDataProcessed: (data: any) => LastRGB;
}

export class WorkerManager {
  private faceRegionWorker!: Worker;
  private lastRGB!: LastRGB;
  private events: WorkerEvents;

  constructor(events: WorkerEvents) {
    this.events = events;
  }

  /**
   * 워커를 초기화합니다.
   */
  public initialize(): void {
    const workerUrl = new URL('../../workers/faceRegionWorker.js', import.meta.url);
    this.faceRegionWorker = new Worker(workerUrl, {
      type: 'module',
    });

    this.lastRGB = { timestamp: 0, r: null, g: null, b: null };
    this.setupWorker();
  }

  /**
   * 워커 메시지 핸들러를 설정합니다.
   */
  private setupWorker(): void {
    this.faceRegionWorker.onmessage = ({ data }) => {
      this.lastRGB = this.events.onDataProcessed(data);
    };
  }

  /**
   * 얼굴 영역 데이터를 워커에 전송합니다.
   */
  public postFaceRegionData(faceRegionData: ImageData): void {
    this.faceRegionWorker.postMessage({ faceRegionData });
  }

  /**
   * 워커를 종료합니다.
   */
  public terminate(): void {
    if (this.faceRegionWorker) {
      this.faceRegionWorker.terminate();
    }
  }

  /**
   * 현재 LastRGB 데이터를 반환합니다.
   */
  public getLastRGB(): LastRGB {
    return this.lastRGB;
  }
}
