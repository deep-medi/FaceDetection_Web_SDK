import { BoundingBox } from '../../types/index.js';
import { updatePositionErrors } from '../../utils/facePosition.ts';
import { checkFacePosition } from '../../utils/facePositionUtils.ts';

export class FacePositionManager {
  private lastPosition: number = 0;
  private lastYPosition: number = 0;
  private positionErr: number = 0;
  private yPositionErr: number = 0;
  private errorBounding: number;

  constructor(errorBounding: number = 4) {
    this.errorBounding = errorBounding;
  }

  /**
   * 얼굴 위치를 업데이트하고 에러를 계산합니다.
   */
  public updateFacePosition(
    boundingBox: BoundingBox,
    video: HTMLVideoElement,
    container: HTMLElement,
  ): { isInCircle: boolean; positionErr: number; yPositionErr: number } {
    const faceX = boundingBox.xCenter * video.videoWidth;
    const faceY = boundingBox.yCenter * video.videoHeight;

    // 얼굴 위치 체크
    const { isInCircle } = checkFacePosition(faceX, faceY, video, container);

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
      this.errorBounding,
    );

    // 좌표 갱신
    this.lastPosition = newLastPosition;
    this.lastYPosition = newLastYPosition;
    this.positionErr = newPositionErr;
    this.yPositionErr = newYPositionErr;

    return {
      isInCircle,
      positionErr: this.positionErr,
      yPositionErr: this.yPositionErr,
    };
  }

  /**
   * 위치 에러를 초기화합니다.
   */
  public resetPositionErrors(): void {
    this.lastPosition = 0;
    this.lastYPosition = 0;
    this.positionErr = 0;
    this.yPositionErr = 0;
  }

  /**
   * 현재 위치 에러를 반환합니다.
   */
  public getPositionErrors(): { positionErr: number; yPositionErr: number } {
    return {
      positionErr: this.positionErr,
      yPositionErr: this.yPositionErr,
    };
  }

  /**
   * 에러 바운딩 값을 설정합니다.
   */
  public setErrorBounding(errorBounding: number): void {
    this.errorBounding = errorBounding;
  }
}
