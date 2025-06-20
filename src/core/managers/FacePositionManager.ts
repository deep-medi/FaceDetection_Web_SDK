import { BoundingBox } from '../../types/index.js';
import { updatePositionErrors } from '../../utils/facePosition.ts';
import { checkFacePosition } from '../../utils/facePositionUtils.ts';

export class FacePositionManager {
  private lastPosition = 0;
  private lastYPosition = 0;
  private positionErr = 0;
  private yPositionErr = 0;

  constructor(private errorBounding = 4) {}

  /**
   * 얼굴 위치를 업데이트하고 에러를 계산합니다.
   */
  public updateFacePosition(
    boundingBox: BoundingBox,
    video: HTMLVideoElement,
    container: HTMLElement,
  ): { isInCircle: boolean } {
    const faceX = boundingBox.xCenter * video.videoWidth;
    const faceY = boundingBox.yCenter * video.videoHeight;

    const { isInCircle } = checkFacePosition(faceX, faceY, video, container);

    ({
      lastPosition: this.lastPosition,
      lastYPosition: this.lastYPosition,
      positionErr: this.positionErr,
      yPositionErr: this.yPositionErr,
    } = updatePositionErrors(
      faceX,
      faceY,
      this.lastPosition,
      this.lastYPosition,
      this.positionErr,
      this.yPositionErr,
      this.errorBounding,
    ));

    return { isInCircle };
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
}
