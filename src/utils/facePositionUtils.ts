import { FacePositionResult } from '../types/index.js';

/**
 * 얼굴 위치가 원형 진행 바 내부에 있는지 확인하는 함수
 * @param faceX - 얼굴의 x 좌표 (비디오 좌표계)
 * @param faceY - 얼굴의 y 좌표 (비디오 좌표계)
 * @param video - 비디오 요소
 * @param container - 원형 진행 바 컨테이너 요소
 * @returns 위치 확인 결과 객체
 */
export function checkFacePosition(
  faceX: number,
  faceY: number,
  video: HTMLVideoElement,
  container: HTMLElement,
): FacePositionResult {
  // 원형 진행 바와 비디오 요소의 화면상 위치 정보 가져오기
  const progressRect = container.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  // 비디오와 progress-bar의 크기 비율 계산
  // 실제 비디오 해상도와 화면에 표시되는 크기의 비율
  const scaleX = video.videoWidth / videoRect.width;
  const scaleY = video.videoHeight / videoRect.height;

  // progress-bar의 중심점을 비디오 좌표계로 변환
  // 화면 좌표를 비디오 내부 좌표로 변환
  const progressCenter = {
    x: (progressRect.left - videoRect.left + progressRect.width / 2) * scaleX,
    y: (progressRect.top - videoRect.top + progressRect.height / 2) * scaleY,
  };

  // progress-bar의 반지름을 비디오 좌표계로 변환
  const radius = (progressRect.width / 2) * scaleX;
  // 허용 범위를 반지름의 30%로 설정(엄격하게)
  const allowedRadius = radius * 0.3;

  // 바운딩 박스 중심점과 progress-bar 중심점 사이의 거리 계산
  // 유클리드 거리 공식 사용
  const distance = Math.sqrt(
    Math.pow(faceX - progressCenter.x, 2) + Math.pow(faceY - progressCenter.y, 2),
  );

  // 얼굴이 허용 범위 내에 있는지 확인
  const isInCircle = distance <= allowedRadius;

  // 결과 반환
  return {
    isInCircle, // 얼굴이 원 안에 있는지 여부
    distance, // 중심점으로부터의 거리
    allowedRadius, // 허용 반지름
    progressCenter, // 원형 진행 바의 중심점 좌표
  };
}
