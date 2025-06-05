# FaceDetection_Web

## 📋 프로젝트 개요

웹 기반 얼굴 인식을 통해 실시간으로 심박수, 스트레스, 혈압 등의 건강 정보를 측정하는 시스템입니다.  
MediaPipe와 Canvas API를 활용하여 비접촉식 생체 신호 측정을 제공합니다.

## ✨ 주요 기능

- **실시간 얼굴 인식**: MediaPipe 기반 고정밀 얼굴 감지
- **비접촉 생체 신호 측정**: RGB 데이터 기반 PPG 신호 추출
- **상태 관리 시스템**: 체계적인 측정 과정 관리
- **크로스 플랫폼**: Chrome, Safari 브라우저 지원

## 🛠 기술 스택

- **핵심 기술**: MediaPipe Face Detection, Canvas API, Web Workers
- **개발 도구**: Vite, TypeScript/JavaScript
- **상태 관리**: Custom State Management System

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
};

// 2. 콜백 설정
const callbacks = {
  onMeasurementComplete: (result) => {
    console.log('심박수:', result.heartRate);
  },
};

// 3. 초기화 및 시작
const sdk = new FaceDetectionSDK(config, callbacks);
await sdk.initialize();
await sdk.startMeasurement();
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

   - 3초 카운트다운 후 자동 측정 시작

4. **데이터 수집** (MEASURING)

   - 15초간 RGB 데이터 자동 수집
   - 실시간 진행률 표시

5. **결과 분석** (COMPLETED)
   - RGB 데이터 수집 완료

### 2. SDK 사용법

```typescript
import { FaceDetectionSDK, FaceDetectionState } from './faceDetectionCore';

// SDK 초기화
const sdk = new FaceDetectionSDK(
  {
    measurement: {
      targetDataPoints: 450,
      frameInterval: 33.33,
      readyToMeasuringDelay: 3,
    },
    faceDetection: {
      timeout: 3000,
      minDetectionConfidence: 0.5,
    },
  },
  {
    onStateChange: (newState, prevState) => {
      console.log(`상태 변경: ${prevState} → ${newState}`);
    },
    onProgress: (progress, dataCount) => {
      console.log(`진행률: ${(progress * 100).toFixed(1)}% (${dataCount}개)`);
    },
    onMeasurementComplete: (result) => {
      console.log('측정 완료:', result);
    },
  },
);

// HTML 요소 설정 후 초기화
await sdk.initializeElements();
await sdk.initialize();

// 측정 시작
await sdk.startMeasurement();
```

## 📊 측정 알고리즘

### 데이터 수집 과정

1. **비디오 프레임 캡처**: 30fps로 웹캠 영상 수집
2. **얼굴 인식**: MediaPipe Face Detection 모델 적용
3. **ROI 추출**: 바운딩 박스 기반 얼굴 영역 분리
4. **RGB 데이터 추출**: 얼굴 영역에서 평균 RGB 값 계산
5. **실시간 처리**: Web Worker를 통한 비동기 데이터 처리
6. **품질 관리**: 위치 오차 및 신호 품질 모니터링

## 🔧 API 참조

### 주요 메서드

```typescript
// 상태 관리
getCurrentState(): FaceDetectionState
isState(state: FaceDetectionState): boolean
onStateChange(callback: StateChangeCallback): void

// 측정 제어
startMeasurement(): Promise<void>
stopDetection(): void
dispose(): void

// 상태 확인
isFaceInsideCircle(): boolean
canRestart(): boolean
isInProgress(): boolean
```

### 이벤트 콜백

```typescript
interface SDKEventCallbacks {
  onStateChange?: StateChangeCallback;
  onProgress?: (progress: number, dataCount: number) => void;
  onFaceDetectionChange?: (detected: boolean, boundingBox: any) => void;
  onFacePositionChange?: (inCircle: boolean) => void;
  onMeasurementComplete?: (result: MeasurementResult) => void;
  onError?: (error: FaceDetectionError) => void;
}
```

## 🚨 오류 처리

### 주요 오류 타입

- `WEBCAM_PERMISSION_DENIED`: 웹캠 권한 거부
- `WEBCAM_ACCESS_FAILED`: 웹캠 접근 실패
- `FACE_NOT_DETECTED`: 얼굴 인식 실패
- `FACE_OUT_OF_CIRCLE`: 얼굴 위치 이탈
- `MEASUREMENT_TIMEOUT`: 측정 시간 초과

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

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
