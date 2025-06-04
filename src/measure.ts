import {
  FaceDetectionSDK,
  CalculatedBoundingBox,
  FaceDetectionState,
  FaceDetectionError,
} from './index.ts';

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
const sdkConfig = {
  platform: {
    isIOS,
    isAndroid,
  },
  debug: {
    enableConsoleLog: true,
  },
  dataDownload: {
    enabled: false,
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
    readyToMeasuringDelay: 5,
  },
};

// SDK 콜백 설정
const sdkCallbacks = {
  onStateChange: (newState: FaceDetectionState, previousState: FaceDetectionState) => {
    console.log(`[SDK Demo] 상태 변경: ${previousState} → ${newState}`);
  },

  onMeasurementComplete: (result: any) => {
    console.log('[SDK Demo] 측정 완료:', result);
  },

  onProgress: (progress: number, dataLength: number) => {
    console.log(
      `[SDK Demo] 측정 진행률: ${Math.round(progress * 100)}%, 데이터 개수: ${dataLength}`,
    );
  },

  onFaceDetectionChange: (detected: boolean, boundingBox: CalculatedBoundingBox | null) => {
    if (!detected) {
      container.style.border = '8px solid red';
    }
    console.log(boundingBox);
  },

  onError: (error: FaceDetectionError) => {
    console.error('[SDK Demo] 오류 발생:', error.type, error.message);

    if (error.originalError) {
      console.error('[SDK Demo] 원본 오류:', error.originalError);
    }
  },
  onFacePositionChange: (isInCircle: boolean) => {
    if (!isInCircle) {
      container.style.border = '8px solid red';
    } else {
      container.style.border = '8px solid green';
    }
  },
};

// SDK 인스턴스 생성
const faceDetectionSDK = new FaceDetectionSDK(sdkConfig, sdkCallbacks);

// 페이지 로드 시 초기화 및 측정 시작
window.onload = async (): Promise<void> => {
  try {
    console.log('[SDK Demo] SDK 초기화 및 측정 시작...');

    // HTML 요소들이 config에 포함되어 있으므로 initializeElements 호출
    await faceDetectionSDK.initializeElements();

    // SDK 초기화 (MediaPipe, 워커 등)
    await faceDetectionSDK.initialize();

    // 측정 시작
    await faceDetectionSDK.startMeasurement();
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
