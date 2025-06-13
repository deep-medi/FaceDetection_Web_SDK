import { FaceDetection } from '@mediapipe/face_detection';

export class MediapipeManager {
  private faceDetection: any;
  private onResultsCallback: ((results: any) => void) | null = null;

  constructor() {}

  /**
   * MediaPipe 초기화
   */
  public async initialize(minDetectionConfidence: number = 0.5): Promise<void> {
    this.faceDetection = new FaceDetection({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
    });

    // 얼굴 인식 옵션 설정
    const faceDetectionConfig = {
      model: 'short',
      minDetectionConfidence,
      runningMode: 'VIDEO',
    };

    this.faceDetection.setOptions(faceDetectionConfig);
  }

  /**
   * 결과 처리 콜백 설정
   */
  public setOnResultsCallback(callback: (results: any) => void): void {
    this.onResultsCallback = callback;
    this.faceDetection.onResults(this.onResultsCallback);
  }

  /**
   * 이미지 전송
   */
  public async sendImage(image: HTMLCanvasElement | HTMLVideoElement): Promise<void> {
    await this.faceDetection.send({ image });
  }

  /**
   * MediaPipe 정리
   */
  public dispose(): void {
    if (this.faceDetection) {
      this.faceDetection = null;
    }
    this.onResultsCallback = null;
  }
}
