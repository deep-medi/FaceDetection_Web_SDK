import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  FaceDetectionProvider,
  FaceDetectionContainer,
  ProgressBar,
  VideoCanvas,
  FaceDetectionSDKConfig,
  FaceDetectionState,
  MeasurementResult,
  useFaceDetectionContext,
} from './index';

// 디바이스 감지
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

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
    enabled: false,
    autoDownload: false,
    filename: 'face_detection_rgb_data.txt',
  },
  measurement: {
    readyToMeasuringDelay: 3,
  },
};

// 커스텀 Progress Bar 컴포넌트
const CustomProgressBar: React.FC = () => {
  const { state, progress } = useFaceDetectionContext();
  const progressPercent = Math.round(progress * 100);

  return (
    <ProgressBar
      className="custom-progress-bar"
      style={{
        width: 240,
        height: 240,
      }}
    >
      <div className="custom-progress-content">
        <div className="progress-circle">
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress)}`}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
        </div>
        <div className="progress-text">
          {state === FaceDetectionState.MEASURING && (
            <div className="progress-percent">{progressPercent}%</div>
          )}
          <div className="state-text">
            {state === FaceDetectionState.INITIAL && '초기화 중...'}
            {state === FaceDetectionState.READY && '원 안에 얼굴을 위치시켜 주세요'}
            {state === FaceDetectionState.MEASURING && '측정 중...'}
            {state === FaceDetectionState.COMPLETED && '측정 완료!'}
          </div>
        </div>
      </div>
    </ProgressBar>
  );
};

// 메인 App 컴포넌트
const App: React.FC = () => {
  const handleStateChange = (newState: FaceDetectionState, previousState: FaceDetectionState) => {
    console.log(`[React SDK Demo] 상태 변경: ${previousState} → ${newState}`);
  };

  const handleMeasurementComplete = (result: MeasurementResult) => {
    console.log('[React SDK Demo] 측정 완료:', result);
  };

  const handleError = (error: any) => {
    console.error('[React SDK Demo] 오류 발생:', error);
  };

  const handleProgress = (progress: number, dataLength: number) => {
    console.log(
      `[React SDK Demo] 측정 진행률: ${Math.round(progress * 100)}%, 데이터 개수: ${dataLength}`,
    );
  };

  const handleFaceDetectionChange = (detected: boolean, boundingBox: any) => {
    console.log('[React SDK Demo] 얼굴 감지:', detected, boundingBox);
  };

  const handleFacePositionChange = (isInCircle: boolean) => {
    console.log('[React SDK Demo] 얼굴 위치:', isInCircle ? '원 안' : '원 밖');
  };

  const handleCountdown = (remainingSeconds: number, totalSeconds: number) => {
    console.log(`[React SDK Demo] 카운트다운: ${remainingSeconds}초 남았습니다...`);
  };

  return (
    <FaceDetectionProvider
      config={sdkConfig}
      onStateChange={handleStateChange}
      onMeasurementComplete={handleMeasurementComplete}
      onError={handleError}
      onProgress={handleProgress}
      onFaceDetectionChange={handleFaceDetectionChange}
      onFacePositionChange={handleFacePositionChange}
      onCountdown={handleCountdown}
    >
      <FaceDetectionContainer>
        <VideoCanvas />
        <CustomProgressBar />
      </FaceDetectionContainer>
    </FaceDetectionProvider>
  );
};

// 페이지 로드 시 React 앱 렌더링
window.onload = (): void => {
  try {
    console.log('[React SDK Demo] React 앱 초기화...');

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('root 요소를 찾을 수 없습니다.');
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    console.log('[React SDK Demo] React 앱 렌더링 완료');
  } catch (error) {
    console.error('[React SDK Demo] React 앱 초기화 실패:', error);
  }
};

// 전역에서 접근 가능하도록 설정 (디버깅용)
(window as any).ReactSDKDemo = {
  App,
  FaceDetectionProvider,
  FaceDetectionContainer,
  ProgressBar,
  VideoCanvas,
};
