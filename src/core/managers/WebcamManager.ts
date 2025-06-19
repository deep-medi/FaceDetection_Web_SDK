import { FaceDetectionSDKConfig } from '../../types/index.js';

export class WebcamManager {
  private webcamStream: MediaStream | null = null;
  private config: FaceDetectionSDKConfig;
  private onWebcamError: (error: Error, isIOS: boolean) => void;

  constructor(
    config: FaceDetectionSDKConfig,
    onWebcamError: (error: Error, isIOS: boolean) => void,
  ) {
    this.config = config;
    this.onWebcamError = onWebcamError;
  }

  /**
   * 웹캠 스트림을 시작합니다.
   */
  public async startWebcam(): Promise<MediaStream> {
    try {
      const videoConfig = {
        width: this.config.video?.width || 640,
        height: this.config.video?.height || 480,
        frameRate: this.config.video?.frameRate || 30,
      };

      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: videoConfig,
      });

      return this.webcamStream;
    } catch (err) {
      this.handleWebcamError(err as Error);
      throw err;
    }
  }

  /**
   * 웹캠 스트림을 중지합니다.
   */
  public stopWebcam(): void {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.webcamStream = null;
    }
  }

  /**
   * 웹캠 에러를 처리합니다.
   */
  private handleWebcamError(err: Error): void {
    const isIOS = this.config.platform?.isIOS || false;
    this.onWebcamError(err, isIOS);
  }

  /**
   * 리소스를 정리합니다.
   */
  public dispose(): void {
    this.stopWebcam();
  }
}
