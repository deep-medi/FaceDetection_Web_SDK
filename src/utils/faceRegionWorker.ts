import { LastRGB } from '../types/index.js';

// 워커 데이터 타입 (이 파일에서만 사용되는 특별한 타입)
interface WorkerProcessData {
  timestamp: number;
  meanRed: number;
  meanGreen: number;
  meanBlue: number;
}

/**
 * RGB 데이터를 처리하고 저장하는 함수
 * @param data - 워커로부터 받은 데이터
 * @param mean_red - 빨간색 값 배열
 * @param mean_green - 초록색 값 배열
 * @param mean_blue - 파란색 값 배열
 * @param timingHist - 타임스탬프 배열
 * @param lastRGB - 마지막 RGB 값 객체
 * @returns 업데이트된 lastRGB 값
 */
export function processFaceRegionData(
  data: WorkerProcessData,
  mean_red: number[],
  mean_green: number[],
  mean_blue: number[],
  timingHist: number[],
  lastRGB: LastRGB,
): LastRGB {
  const { timestamp } = data;
  let { meanRed, meanGreen, meanBlue } = data;

  // 동일한 타임스탬프이거나 RGB 값이 0인 경우 처리하지 않음
  if (timestamp === lastRGB.timestamp) return lastRGB;
  if (meanRed === 0 || meanGreen === 0 || meanBlue === 0) return lastRGB;

  // 이전 값과 동일한 경우 약간의 랜덤성 추가
  if (lastRGB.r === meanRed && lastRGB.g === meanGreen && lastRGB.b === meanBlue) {
    meanRed += (Math.random() - 0.5) * 0.01;
    meanGreen += (Math.random() - 0.5) * 0.01;
    meanBlue += (Math.random() - 0.5) * 0.01;
  }

  // 데이터 저장
  mean_red.push(meanRed);
  mean_green.push(meanGreen);
  mean_blue.push(meanBlue);
  timingHist.push(timestamp);

  // 마지막 RGB 값 업데이트
  return {
    timestamp,
    r: meanRed,
    g: meanGreen,
    b: meanBlue,
  };
}
