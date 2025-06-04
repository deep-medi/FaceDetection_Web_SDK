// 얼굴 인식 처리 관련 유틸리티 함수들
import { calculateBoundingBox } from './facePosition';
import { FaceDetectionResults, ProcessContext, ProcessResultsReturn } from '../types/index.js';

/**
 * MediaPipe 얼굴 인식 결과를 처리하는 함수
 * 얼굴 감지 상태를 관리하고 적절한 콜백 함수를 호출
 * @param results - MediaPipe 얼굴 인식 결과
 * @param context - 얼굴 인식 처리에 필요한 컨텍스트 객체
 * @returns 업데이트된 상태 정보
 */
export function processResults(
  results: FaceDetectionResults,
  {
    isFirstFrame,
    isFaceDetected,
    faceDetectionTimer,
    FACE_DETECTION_TIMEOUT,
    handleFaceDetection,
    handleNoDetection,
    mean_red,
  }: ProcessContext,
): ProcessResultsReturn {
  // 첫 프레임 처리 시 얼굴 감지 타임아웃 타이머 시작
  if (isFirstFrame) {
    isFirstFrame = false;

    // 모델 로드 완료 및 첫 프레임 처리 후 타이머 시작
    // 지정된 시간 내에 얼굴이 감지되지 않으면 오류 처리
    faceDetectionTimer = setTimeout(() => {
      if (!isFaceDetected) {
        handleNoDetection(); // 얼굴 미감지 오류 처리
      }
    }, FACE_DETECTION_TIMEOUT);
  }

  // 얼굴이 감지된 경우
  if (results.detections && results.detections.length > 0) {
    const detection = results.detections[0]; // 첫 번째 감지된 얼굴 사용

    // 얼굴 영역의 바운딩 박스 계산
    const lastBoundingBox = calculateBoundingBox(
      detection,
      results.image.width,
      results.image.height,
    );

    // 얼굴 감지 처리 콜백 호출
    handleFaceDetection(detection);

    // 얼굴이 처음 감지된 경우 타이머 해제
    if (!isFaceDetected) {
      isFaceDetected = true;
      if (faceDetectionTimer) {
        clearTimeout(faceDetectionTimer); // 타임아웃 타이머 해제
        faceDetectionTimer = null;
      }
    }

    // 업데이트된 상태 반환
    return { isFirstFrame, isFaceDetected, faceDetectionTimer, lastBoundingBox };
  }
  // 얼굴이 감지되지 않았지만 이미 측정이 진행 중인 경우 (30프레임 이상)
  else if (mean_red.length > 30) {
    handleNoDetection(); // 측정 중단 처리
  }

  // 얼굴이 감지되지 않은 상태 반환
  return { isFirstFrame, isFaceDetected, faceDetectionTimer, lastBoundingBox: null };
}
