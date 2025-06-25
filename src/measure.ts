import { FaceDetectionSDK, type SDKEventCallbacks, type FaceDetectionSDKConfig } from './index.ts';

// 디바이스 감지
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

// HTML 요소들 생성
const video = document.getElementById('input_video') as HTMLVideoElement;
const canvasElement = document.querySelector('.output_canvas') as HTMLCanvasElement;
const videoCanvas = document.createElement('canvas');
const container = document.querySelector('.progress-bar') as HTMLElement;

// 비디오 캔버스 설정
videoCanvas.width = 640;
videoCanvas.height = 480;
videoCanvas.style.display = 'none';

if (!video || !canvasElement || !container) {
  throw new Error('필수 HTML 요소를 찾을 수 없습니다.');
}

// SDK 설정
const sdkConfig: FaceDetectionSDKConfig = {
  platform: {
    isIOS,
    isAndroid,
  },
  debug: {
    enableConsoleLog: true,
  },
  dataDownload: {
    enabled: true,
    autoDownload: false, // 새 창에서 사용자 입력으로 다운로드
    filename: 'face_detection_rgb_data.txt',
  },
  elements: {
    video,
    canvasElement,
    videoCanvas,
    container,
  },
  measurement: {
    readyToMeasuringDelay: 3,
  },
};

// SDK 콜백 설정
const sdkCallbacks: SDKEventCallbacks = {
  onStateChange: (newState, previousState) => {
    console.log(`[SDK Demo] 상태 변경: ${previousState} → ${newState}`);
  },

  onMeasurementComplete: (result) => {
    console.log('[SDK Demo] 측정 완료:', result);
  },

  onProgress: (progress, dataLength) => {
    console.log(
      `[SDK Demo] 측정 진행률: ${Math.round(progress * 100)}%, 데이터 개수: ${dataLength}`,
    );
  },

  onFaceDetectionChange: (detected, boundingBox) => {
    if (!detected) {
      container.style.border = '8px solid red';
    }
    console.log(boundingBox);
  },

  onError: (error) => {
    console.error('[SDK Demo] 오류 발생:', error.type, error.message);
  },
  onFacePositionChange: (isInCircle) => {
    if (!isInCircle) {
      container.style.border = '8px solid red';
    } else {
      container.style.border = '8px solid green';
    }
  },
  onCountdown: (remainingSeconds) => {
    console.log(`[SDK Demo] 카운트다운: ${remainingSeconds}초 남았습니다...`);
  },
};

// SDK 인스턴스 생성
const faceDetectionSDK = new FaceDetectionSDK(sdkConfig, sdkCallbacks);

// 페이지 로드 시 초기화 및 측정 시작
window.onload = async (): Promise<void> => {
  try {
    console.log('[SDK Demo] SDK 초기화 및 측정 시작...');

    // SDK 완전 초기화 및 측정 시작 (한 번에 처리)
    await faceDetectionSDK.initializeAndStart();

    console.log('[SDK Demo] 준비 완료');
  } catch (error) {
    console.error('[SDK Demo] 초기화 또는 측정 시작 실패:', error);
  }
};

// 페이지 언로드 시 정리
window.onbeforeunload = (): void => {
  console.log('[SDK Demo] SDK 정리 중...');
  faceDetectionSDK.dispose();
};

// 전역에서 접근 가능하도록 설정 (디버깅용)
(window as any).faceDetectionSDK = faceDetectionSDK;
