/**
 * FaceDetection Web SDK - 기본 사용 예제
 *
 * 이 파일은 SDK를 사용하여 얼굴 감지 및 건강 측정을 수행하는 기본적인 예제입니다.
 * 실제 프로젝트에서 사용할 때는 이 코드를 참고하여 구현하세요.
 */

// SDK를 import합니다
import { FaceDetectionSDK } from '@deep-medi/face-detection-web-sdk';

/**
 * 1. 디바이스 감지
 * 사용자의 디바이스 정보를 확인합니다.
 */
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

console.log('디바이스 정보:', { isIOS, isAndroid });

/**
 * 2. HTML 요소 가져오기
 * SDK에서 사용할 HTML 요소들을 선택합니다.
 */
const video = document.getElementById('input_video');
const canvasElement = document.querySelector('.output_canvas');
const container = document.querySelector('.progress-bar');
const guideText = document.querySelector('.guide-text');

// 비디오 캔버스 생성 (SDK에서 내부적으로 사용)
const videoCanvas = document.createElement('canvas');
videoCanvas.width = 640;
videoCanvas.height = 480;
videoCanvas.style.display = 'none';

// 필수 요소 확인
if (!video || !canvasElement || !container) {
  throw new Error('필수 HTML 요소를 찾을 수 없습니다. HTML 구조를 확인하세요.');
}

/**
 * 3. SDK 설정 구성
 * SDK의 동작을 설정합니다.
 */
const sdkConfig = {
  // 플랫폼 정보
  platform: {
    isIOS,
    isAndroid,
  },

  // 디버그 설정
  debug: {
    enableConsoleLog: true, // 콘솔 로그 활성화
  },

  // 데이터 다운로드 설정
  dataDownload: {
    enabled: false, // 데이터 다운로드 비활성화
    autoDownload: false, // 자동 다운로드 비활성화
    filename: 'face_detection_rgb_data.txt',
  },

  // HTML 요소 설정
  elements: {
    video, // 웹캠 비디오 요소
    canvasElement, // 결과를 그릴 캔버스
    videoCanvas, // 내부 처리용 캔버스
    container, // 가이드 컨테이너
  },

  // 측정 설정
  measurement: {
    readyToMeasuringDelay: 3, // 측정 준비 시간 (초)
  },
};

/**
 * 4. SDK 이벤트 콜백 설정
 * SDK에서 발생하는 다양한 이벤트를 처리합니다.
 */
const sdkCallbacks = {
  /**
   * 상태 변경 시 호출
   * @param {string} newState - 새로운 상태
   * @param {string} previousState - 이전 상태
   */
  onStateChange: (newState, previousState) => {
    console.log(`[SDK] 상태 변경: ${previousState} → ${newState}`);
  },

  /**
   * 측정 완료 시 호출
   * @param {Object} result - 측정 결과
   */
  onMeasurementComplete: (result) => {
    console.log('[SDK] 측정 완료:', result);
  },

  /**
   * 측정 진행률 업데이트 시 호출
   * @param {number} progress - 진행률 (0-1)
   * @param {number} dataLength - 수집된 데이터 개수
   */
  onProgress: (progress, dataLength) => {
    const progressPercent = Math.round(progress * 100);
    console.log(`[SDK] 측정 진행률: ${progressPercent}%, 데이터: ${dataLength}개`);

    // 진행률 표시
    updateGuideText(`측정 중... ${progressPercent}%`);
  },

  /**
   * 얼굴 감지 상태 변경 시 호출
   * @param {boolean} detected - 얼굴 감지 여부
   * @param {Object} boundingBox - 얼굴 영역 정보
   */
  onFaceDetectionChange: (detected, boundingBox) => {
    if (!detected) {
      // 얼굴이 감지되지 않을 때 빨간색 테두리
      container.style.border = '8px solid #ff4444';
      updateGuideText('얼굴을 화면에 맞춰주세요');
    }

    console.log('[SDK] 얼굴 감지:', detected, boundingBox);
  },

  /**
   * 얼굴 위치 변경 시 호출
   * @param {boolean} isInCircle - 원 안에 얼굴이 있는지 여부
   */
  onFacePositionChange: (isInCircle) => {
    if (isInCircle) {
      // 올바른 위치일 때 초록색 테두리
      container.style.border = '8px solid #44ff44';
      updateGuideText('좋습니다! 가만히 계세요');
    } else {
      // 잘못된 위치일 때 빨간색 테두리
      container.style.border = '8px solid #ff4444';
      updateGuideText('원 안에 얼굴을 위치시켜 주세요');
    }
  },

  /**
   * 오류 발생 시 호출
   * @param {Object} error - 오류 정보
   */
  onError: (error) => {
    console.error('[SDK] 오류 발생:', error.type, error.message);

    if (error.originalError) {
      console.error('[SDK] 원본 오류:', error.originalError);
    }

    // 사용자에게 오류 알림
    updateGuideText(`오류: ${error.message}`);
    container.style.border = '8px solid #ff4444';
  },
};

/**
 * 5. SDK 인스턴스 생성
 */
const faceDetectionSDK = new FaceDetectionSDK(sdkConfig, sdkCallbacks);

/**
 * 6. 초기화 및 측정 시작
 */
async function initializeAndStart() {
  try {
    console.log('[Demo] SDK 초기화 시작...');
    updateGuideText('초기화 중...');

    // 요소 초기화
    await faceDetectionSDK.initializeElements();
    console.log('[Demo] HTML 요소 초기화 완료');

    // SDK 초기화 (MediaPipe, 워커 등)
    await faceDetectionSDK.initialize();
    console.log('[Demo] SDK 초기화 완료');

    // 측정 시작
    await faceDetectionSDK.startMeasurement();
    console.log('[Demo] 측정 시작 완료');
  } catch (error) {
    console.error('[Demo] 초기화 실패:', error);
    updateGuideText('초기화 실패. 새로고침해 주세요.');
  }
}

/**
 * 7. 정리 함수
 */
function cleanup() {
  console.log('[Demo] SDK 정리 중...');
  faceDetectionSDK.dispose();
}

/**
 * 8. 유틸리티 함수들
 */

/**
 * 가이드 텍스트 업데이트
 * @param {string} text - 표시할 텍스트
 */
function updateGuideText(text) {
  if (guideText) {
    guideText.textContent = text;
  }
}

/**
 * 9. 이벤트 리스너 등록
 */

// 페이지 로드 시 초기화
window.addEventListener('load', initializeAndStart);

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', cleanup);

// 전역에서 접근 가능하도록 설정 (디버깅용)
window.faceDetectionSDK = faceDetectionSDK;

// 개발자 도구에서 사용할 수 있는 함수들
window.debugFunctions = {
  startMeasurement: () => faceDetectionSDK.startMeasurement(),
  stopMeasurement: () => faceDetectionSDK.stopMeasurement(),
  getState: () => faceDetectionSDK.getCurrentState(),
  dispose: cleanup,
};
