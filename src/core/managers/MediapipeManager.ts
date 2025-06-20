import { FaceDetection } from '@mediapipe/face_detection';

export class MediapipeManager {
  private faceDetection: any;
  private onResultsCallback: ((results: any) => void) | null = null;

  constructor() {}

  /**
   * MediaPipe Face Detection을 초기화합니다.
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
   * 얼굴 인식 결과 처리 콜백을 설정합니다.
   */
  public setOnResultsCallback(callback: (results: any) => void): void {
    this.onResultsCallback = callback;
    this.faceDetection.onResults(this.onResultsCallback);
  }

  /**
   * 이미지를 MediaPipe에 전송하여 얼굴 인식을 수행합니다.
   */
  public async sendImage(image: HTMLCanvasElement | HTMLVideoElement): Promise<void> {
    await this.faceDetection.send({ image });
  }

  /**
   * MediaPipe 리소스를 정리합니다.
   */
  public dispose(): void {
    this.faceDetection = null;
    this.onResultsCallback = null;
  }
}
