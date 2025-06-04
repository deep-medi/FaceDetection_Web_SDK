import { Detection, CalculatedBoundingBox, PositionUpdateResult } from '../types/index.js';

/**
 * 얼굴 영역의 바운딩 박스를 계산하는 함수
 * @param detection - 얼굴 감지 결과
 * @param imageWidth - 이미지 너비
 * @param imageHeight - 이미지 높이
 * @returns 계산된 바운딩 박스 좌표와 크기
 */
export function calculateBoundingBox(
  { boundingBox }: Detection,
  imageWidth: number,
  imageHeight: number,
): CalculatedBoundingBox {
  const scaleFactor = 0.6;
  const width = boundingBox.width * imageWidth * scaleFactor;
  const height = boundingBox.height * imageHeight * scaleFactor;
  const left = boundingBox.xCenter * imageWidth - width / 2;
  const top = boundingBox.yCenter * imageHeight - height / 2;
  return { left, top, width, height };
}

/**
 * 얼굴 위치 오류를 업데이트하는 함수
 * @param left - 현재 x 좌표
 * @param top - 현재 y 좌표
 * @param lastPosition - 이전 x 좌표
 * @param lastYPosition - 이전 y 좌표
 * @param positionErr - x축 오류 카운트
 * @param yPositionErr - y축 오류 카운트
 * @param errorBounding - 오류 허용 범위
 * @returns 업데이트된 위치 정보와 오류 카운트
 */
export function updatePositionErrors(
  left: number,
  top: number,
  lastPosition: number,
  lastYPosition: number,
  positionErr: number,
  yPositionErr: number,
  errorBounding: number,
): PositionUpdateResult {
  if (lastPosition && Math.abs(left - lastPosition) > errorBounding) positionErr++;
  if (lastYPosition && Math.abs(top - lastYPosition) > errorBounding) yPositionErr++;

  return {
    lastPosition: left,
    lastYPosition: top,
    positionErr,
    yPositionErr,
  };
}
