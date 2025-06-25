import { LastRGB } from '../types/index.js';

/**
 * 원형 영역에서 RGB 데이터를 추출하는 함수
 * @param videoCtx - 비디오 캔버스 컨텍스트
 * @param container - 원형 진행 바 컨테이너 요소
 * @param video - 비디오 요소
 * @returns RGB 데이터 객체
 */
export function extractRGBFromCircleRegion(
  videoCtx: CanvasRenderingContext2D,
  container: HTMLElement,
  video: HTMLVideoElement,
): LastRGB {
  // 원형 진행 바와 비디오 요소의 화면상 위치 정보 가져오기
  const progressRect = container.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  // 비디오와 progress-bar의 크기 비율 계산
  const scaleX = video.videoWidth / videoRect.width;
  const scaleY = video.videoHeight / videoRect.height;

  // progress-bar의 중심점을 비디오 좌표계로 변환
  const progressCenter = {
    x: (progressRect.left - videoRect.left + progressRect.width / 2) * scaleX,
    y: (progressRect.top - videoRect.top + progressRect.height / 2) * scaleY,
  };

  // progress-bar의 반지름을 비디오 좌표계로 변환 (60%만 사용)
  const radius = (progressRect.width / 2) * scaleX;

  // 원형 영역의 경계 계산
  const minX = Math.max(0, Math.floor(progressCenter.x - radius));
  const maxX = Math.min(video.videoWidth - 1, Math.ceil(progressCenter.x + radius));
  const minY = Math.max(0, Math.floor(progressCenter.y - radius));
  const maxY = Math.min(video.videoHeight - 1, Math.ceil(progressCenter.y + radius));

  // 원형 영역의 이미지 데이터 추출
  const imageData = videoCtx.getImageData(minX, minY, maxX - minX + 1, maxY - minY + 1);
  const data = new Uint32Array(imageData.data.buffer);

  let sumRed = 0;
  let sumGreen = 0;
  let sumBlue = 0;
  let validPixelCount = 0;

  // 원형 영역 내의 픽셀들만 처리
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // 원의 중심으로부터의 거리 계산
      const distance = Math.sqrt(
        Math.pow(x - progressCenter.x, 2) + Math.pow(y - progressCenter.y, 2),
      );

      // 원 내부에 있는 픽셀만 처리
      if (distance <= radius) {
        const pixelIndex = (y - minY) * (maxX - minX + 1) + (x - minX);
        const pixel = data[pixelIndex];

        // 각각의 색상 채널을 추출
        sumRed += pixel & 0xff; // R
        sumGreen += (pixel >> 8) & 0xff; // G
        sumBlue += (pixel >> 16) & 0xff; // B
        validPixelCount++;
      }
    }
  }

  // 평균 RGB 값 계산
  const meanRed = validPixelCount > 0 ? sumRed / validPixelCount : 0;
  const meanGreen = validPixelCount > 0 ? sumGreen / validPixelCount : 0;
  const meanBlue = validPixelCount > 0 ? sumBlue / validPixelCount : 0;

  return {
    timestamp: Date.now() * 1000,
    r: meanRed,
    g: meanGreen,
    b: meanBlue,
  };
}
