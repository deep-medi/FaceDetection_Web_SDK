# FaceDetection Web SDK - 기본 데모

이 예제는 FaceDetection Web SDK를 사용하여 웹 브라우저에서 얼굴 감지 및 건강 측정을 수행하는 기본적인 방법을 보여줍니다.

## 📁 파일 구조

```
examples/basic-demo/
├── index.html      # 데모 웹 페이지
├── demo.js         # SDK 사용 예제 코드
└── README.md       # 이 파일
```

## 🚀 실행 방법

### 1. 웹 서버 사용 (권장)

보안 정책으로 인해 로컬에서 실행할 때는 웹 서버가 필요합니다.

```bash
# 프로젝트 루트에서 실행 (개발 및 배포 공통)
npm run demo

# 또는 직접 vite 서버 실행
npx vite examples/basic-demo --port 8080
```

### 2. 브라우저에서 접속

```
http://localhost:8080
```

## 💡 주요 기능

### 1. 얼굴 감지

- 웹캠을 통해 실시간으로 얼굴을 감지합니다
- 얼굴이 원형 가이드 안에 위치했는지 확인합니다

### 2. 건강 측정

- 얼굴 색상 변화를 분석하여 심박수를 측정합니다
- 측정 진행률을 실시간으로 표시합니다

### 3. 사용자 인터페이스

- 직관적인 원형 가이드 프레임
- 상태별 안내 메시지
- 측정 진행률 표시

## 🔧 코드 설명

### SDK 초기화

```javascript
import { FaceDetectionSDK } from 'face-detection-web-sdk';

const sdkConfig = {
  platform: { isIOS, isAndroid },
  debug: { enableConsoleLog: true },
  elements: { video, canvasElement, videoCanvas, container },
  measurement: { readyToMeasuringDelay: 5 },
};

const faceDetectionSDK = new FaceDetectionSDK(sdkConfig, callbacks);
```

### 이벤트 처리

```javascript
const callbacks = {
  onStateChange: (newState, previousState) => {
    // 상태 변경 처리
  },
  onMeasurementComplete: (result) => {
    // 측정 완료 처리
  },
  onProgress: (progress, dataLength) => {
    // 진행률 업데이트
  },
  onFacePositionChange: (isInCircle) => {
    // 얼굴 위치 변경 처리
  },
  onError: (error) => {
    // 오류 처리
  },
};
```

### 사용 흐름

1. SDK 인스턴스 생성
2. HTML 요소 초기화
3. SDK 초기화 (MediaPipe 등)
4. 측정 시작
5. 이벤트 처리 및 UI 업데이트

## 🎯 사용자 경험

1. **초기화**: 페이지 로드 시 자동으로 SDK가 초기화됩니다
2. **얼굴 감지**: 웹캠 권한을 허용하고 원 안에 얼굴을 위치시킵니다
3. **측정**: 얼굴이 올바른 위치에 있으면 자동으로 측정이 시작됩니다
4. **결과**: 측정 완료 시 결과가 알림으로 표시됩니다

## 🛠️ 개발자 도구

브라우저 개발자 도구에서 다음 명령을 사용할 수 있습니다:

```javascript
// 현재 상태 확인
window.debugFunctions.getState();

// 측정 시작
window.debugFunctions.startMeasurement();

// 측정 중지
window.debugFunctions.stopMeasurement();

// SDK 정리
window.debugFunctions.dispose();
```

## 📱 지원 브라우저

- Chrome (권장)
- Firefox
- Safari
- Edge

## ⚠️ 주의사항

1. **HTTPS 필요**: 프로덕션 환경에서는 HTTPS가 필요합니다
2. **웹캠 권한**: 웹캠 접근 권한이 필요합니다
3. **조명**: 충분한 조명이 있는 환경에서 사용해주세요
4. **안정성**: 측정 중에는 움직이지 않는 것이 좋습니다
