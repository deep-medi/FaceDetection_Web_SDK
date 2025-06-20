# FaceDetection_Web

## 📋 프로젝트 개요

웹 기반 얼굴 인식을 통해 실시간으로 RGB 데이터를 추출하는 시스템입니다.  
이를 통해 심박수, 스트레스, 혈압 등의 건강 정보를 측정할 수 있습니다.  
MediaPipe와 Canvas API를 활용하여 비접촉식 생체 신호 측정을 제공합니다.

## ✨ 주요 기능

- **실시간 얼굴 인식**: MediaPipe 기반 고정밀 얼굴 감지
- **비접촉 생체 신호 측정**: RGB 데이터 추출
- **상태 관리 시스템**: 체계적인 측정 과정 관리
- **크로스 플랫폼**: Chrome, Safari 브라우저 지원
- **Manager 기반 아키텍처**: 모듈화된 기능별 관리 시스템
- **플랫폼별 다운로드**: Android/iOS 환경 감지 및 최적화

## 🛠 기술 스택

- **핵심 기술**: MediaPipe Face Detection, Canvas API, Web Workers
- **개발 도구**: Vite, TypeScript/JavaScript
- **상태 관리**: Custom State Management System with Manager Architecture

## 🏗️ 아키텍처 개요

### Manager 기반 구조

SDK는 기능별로 분리된 Manager 클래스들로 구성되어 있습니다:

- **ConfigManager**: 설정 관리 및 검증
- **EventManager**: 이벤트 발생 및 콜백 처리
- **MediapipeManager**: MediaPipe 얼굴 인식 처리
- **StateManager**: 상태 전환 및 관리
- **WebcamManager**: 웹캠 스트림 관리
- **FacePositionManager**: 얼굴 위치 추적 및 검증
- **WorkerManager**: Web Worker를 통한 데이터 처리
- **MeasurementManager**: 측정 과정 및 데이터 수집 관리

## 🔄 상태 관리 시스템

### 상태 정의

```typescript
export enum FaceDetectionState {
  INITIAL = 'initial', // 초기 상태 (준비, 얼굴 위치 조정)
  READY = 'ready', // 준비 완료 (카운트다운 중)
  MEASURING = 'measuring', // 측정 중 (RGB 데이터 수집)
  COMPLETED = 'completed', // 측정 완료
}
```

### 상태 전환 흐름

```
INITIAL → READY → MEASURING → COMPLETED
   ↑↓       ↓         ↑↓
 ERROR  ← ERROR     ERROR
```

## 📱 지원 플랫폼

- **데스크톱**: Chrome, Safari
- **모바일**: Android Chrome, iOS Safari
- **요구사항**: 웹캠 접근 권한, 안정적인 네트워크 연결

## 🚀 설치 및 실행

### 설치

```bash
npm install
```

### 개발 모드 실행

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 🎯 예제 및 데모

### 기본 데모

```bash
# 예제 데모 실행
cd node_modules/face-detection-web-sdk
npm run demo

# 브라우저에서 접속
http://localhost:8080
```

### 예제 구조

```
examples/
└── basic-demo/          # 기본 사용법 데모
    ├── index.html       # HTML 예제
    ├── demo.js         # JavaScript 예제
    └── README.md       # 상세 설명
```

### 빠른 시작

```javascript
import { FaceDetectionSDK } from 'face-detection-web-sdk';

// 1. SDK 설정
const config = {
  elements: { video, canvasElement, videoCanvas, container },
  measurement: { readyToMeasuringDelay: 5 },
  dataDownload: {
    enabled: true,
    autoDownload: false,
    filename: 'rgb_data.txt',
  },
  platform: {
    isAndroid: /Android/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  },
};

// 2. 콜백 설정
const callbacks = {
  onMeasurementComplete: (result) => {
    console.log('심박수:', result.heartRate);
    console.log('품질 정보:', result.quality);
  },
  onCountdown: (remainingSeconds, totalSeconds) => {
    console.log(`카운트다운: ${remainingSeconds}/${totalSeconds}`);
  },
  onStateChange: (newState, prevState) => {
    console.log(`상태 변경: ${prevState} → ${newState}`);
  },
};

// 3. 초기화 및 시작 (한 번에 처리)
const sdk = new FaceDetectionSDK(config, callbacks);
await sdk.initializeAndStart();
```

## 💡 사용법

### 1. 기본 사용 과정

1. **카메라 권한 허용**

   - 웹캠 접근 권한 필수
   - 권한 거부 시 측정 불가

2. **얼굴 위치 조정** (INITIAL → READY)

   - 얼굴을 화면 중앙 원 안에 위치
   - 적절한 조명 환경 확보

3. **자동 카운트다운** (READY → MEASURING)

   - 설정된 시간(기본 3초) 카운트다운 후 자동 측정 시작
   - `onCountdown` 콜백으로 실시간 카운트다운 정보 제공

4. **데이터 수집** (MEASURING)

   - 15초간 RGB 데이터 자동 수집
   - 실시간 진행률 표시
   - Web Worker를 통한 비동기 처리

5. **결과 분석** (COMPLETED)
   - RGB 데이터 수집 완료
   - 품질 정보 포함 (위치 오차, 데이터 포인트 수 등)

### 2. SDK 사용법

```typescript
import { FaceDetectionSDK, FaceDetectionState } from './faceDetectionCore';

// SDK 초기화 및 설정
const sdk = new FaceDetectionSDK(
  {
    measurement: {
      readyToMeasuringDelay: 3,
      frameInterval: 33.33,
      frameProcessInterval: 30,
    },
    faceDetection: {
      timeout: 3000,
      minDetectionConfidence: 0.5,
    },
    dataDownload: {
      enabled: true,
      autoDownload: false,
      filename: 'measurement_data.txt',
    },
    platform: {
      isAndroid: /Android/i.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    },
    debug: {
      enabled: true,
      enableConsoleLog: true,
    },
  },
  {
    onStateChange: (newState, prevState) => {
      console.log(`상태 변경: ${prevState} → ${newState}`);
    },
    onProgress: (progress, dataCount) => {
      console.log(`진행률: ${(progress * 100).toFixed(1)}% (${dataCount}개)`);
    },
    onCountdown: (remainingSeconds, totalSeconds) => {
      console.log(`카운트다운: ${remainingSeconds}/${totalSeconds}초`);
    },
    onMeasurementComplete: (result) => {
      console.log('측정 완료:', result);
      console.log('품질 정보:', result.quality);
    },
    onFaceDetectionChange: (detected, boundingBox) => {
      console.log('얼굴 인식:', detected ? '감지됨' : '감지 안됨');
    },
    onFacePositionChange: (inCircle) => {
      console.log('얼굴 위치:', inCircle ? '원 안' : '원 밖');
    },
  },
);

// 초기화 및 측정 시작
await sdk.initializeAndStart();
```

## 📊 측정 알고리즘

### 데이터 수집 과정

1. **비디오 프레임 캡처**: 설정 가능한 프레임 간격으로 웹캠 영상 수집
2. **얼굴 인식**: MediaPipe Face Detection 모델 적용
3. **ROI 추출**: 바운딩 박스 기반 얼굴 영역 분리
4. **RGB 데이터 추출**: 얼굴 영역에서 평균 RGB 값 계산
5. **실시간 처리**: Web Worker를 통한 비동기 데이터 처리
6. **품질 관리**: 위치 오차 및 신호 품질 모니터링
7. **플랫폼별 최적화**: Android/iOS 환경에 따른 다운로드 처리

## 🔧 API 참조

### 주요 메서드

```typescript
// 🚀 초기화 및 시작
initializeAndStart(): Promise<void>

// 📊 상태 관리
getCurrentState(): FaceDetectionState
isState(state: FaceDetectionState): boolean
isAnyState(...states: FaceDetectionState[]): boolean

// 🔍 상태 확인
isFaceInsideCircle(): boolean

// 🧹 정리
dispose(): void
```

### 이벤트 콜백

```typescript
interface SDKEventCallbacks {
  onStateChange?: (newState: FaceDetectionState, previousState: FaceDetectionState) => void;
  onProgress?: (progress: number, dataCount: number) => void;
  onCountdown?: (remainingSeconds: number, totalSeconds: number) => void; // 새로운 콜백
  onFaceDetectionChange?: (detected: boolean, boundingBox: CalculatedBoundingBox | null) => void;
  onFacePositionChange?: (inCircle: boolean) => void;
  onMeasurementComplete?: (result: MeasurementResult) => void;
  onError?: (error: FaceDetectionError) => void;
}
```

### 설정 옵션

```typescript
interface FaceDetectionSDKConfig {
  measurement?: {
    readyToMeasuringDelay?: number; // 카운트다운 시간 (초)
    frameInterval?: number; // 프레임 간격 (ms)
    frameProcessInterval?: number; // 프레임 처리 간격
  };
  faceDetection?: {
    timeout?: number; // 얼굴 인식 타임아웃 (ms)
    minDetectionConfidence?: number; // 최소 감지 신뢰도
  };
  dataDownload?: {
    enabled?: boolean; // 다운로드 기능 활성화
    autoDownload?: boolean; // 자동 다운로드
    filename?: string; // 파일명
  };
  platform?: {
    isAndroid?: boolean; // Android 플랫폼 여부
    isIOS?: boolean; // iOS 플랫폼 여부
  };
  debug?: {
    enabled?: boolean; // 디버그 모드
    enableConsoleLog?: boolean; // 콘솔 로그 활성화
  };
}
```

## 🚨 오류 처리

### 주요 오류 타입

- `WEBCAM_PERMISSION_DENIED`: 웹캠 권한 거부
- `WEBCAM_ACCESS_FAILED`: 웹캠 접근 실패
- `FACE_NOT_DETECTED`: 얼굴 인식 실패
- `FACE_OUT_OF_CIRCLE`: 얼굴 위치 이탈
- `MEASUREMENT_TIMEOUT`: 측정 시간 초과
- `INITIALIZATION_FAILED`: SDK 초기화 실패

### 디버깅

```typescript
// 디버그 모드 활성화
const sdk = new FaceDetectionSDK({
  debug: {
    enabled: true,
    enableConsoleLog: true,
  },
});

// 실시간 상태 모니터링
setInterval(() => {
  console.log('현재 상태:', sdk.getCurrentState());
  console.log('얼굴 위치:', sdk.isFaceInsideCircle());
}, 1000);
```

## 📋 변경이력

모든 주요 변경사항은 [CHANGELOG.md](./CHANGELOG.md)에서 확인할 수 있습니다.

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.
