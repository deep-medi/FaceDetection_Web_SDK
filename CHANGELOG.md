# 변경이력 (CHANGELOG)

이 파일은 face-detection-web-sdk의 모든 주요 변경사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)을 기반으로 하며,
이 프로젝트는 [의미적 버전 관리](https://semver.org/lang/ko/)를 따릅니다.

## [0.2.0](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.14...v0.2.0) (2025-06-20)


### 🔧 기타 수정

* **release:** 0.1.14 ([8bf49ed](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/8bf49ed0f0c71b40b2056b9407aaa5ba459fc8c0))


### 🐛 버그 수정

* 에러 타입 처리 수정 ([5cd66f4](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/5cd66f48e3c9ef9bc88f3ec5d8a5eba21f8d5672))
* 측정 지연 시간 수정 및 에러 처리 개선 ([8c6fd21](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/8c6fd21dce71b4d12812dbb879afd1e3c3c18413))


### ✨ 새로운 기능

* 카운트다운 기능 추가 및 이벤트 관리 개선 ([cee8298](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/cee82987f7a85cd5e66dbaef9f70be3c05035350))


### ♻️ 코드 리팩토링

* 상태 변경 콜백 실행 방식을 개선하여 코드 가독성을 향상시킴 ([acc7117](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/acc71173ab6062572692e134def99d3a2e046e5f))
* 얼굴 인식 로직을 개선하여 코드 가독성을 높이고 중복된 처리 로직을 메서드로 분리 ([e553e65](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/e553e655c72e70e5dd3c142b8ef1a3b8dcf3daaf))
* 얼굴 인식 초기화 및 비디오 처리 로직을 메서드로 분리하여 코드 가독성 향상 ([e52325a](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/e52325a701fe246ff36d19121410610ab6c6d21b))
* ConfigManager 및 EventManager의 코드 가독성을 향상시키기 위해 중복 제거 및 간결한 문법 사용 ([b3a752c](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/b3a752cf505d92a5e52bd481575a792ef460623d))
* FacePositionManager 및 MeasurementManager에서 코드 간결성을 위해 중복 제거 및 초기화 방식 개선 ([f272d4e](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/f272d4e243589d5e243a06196a2f184ac58f69c8))


### 📝 문서

* README.md 업데이트 - Manager 기반 아키텍처 및 데이터 다운로드 설정 추가, 상태 관리 시스템 개선 ([e33481d](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/e33481debf3b172caf8dce7bc3d18f64c98bca65))

### [0.1.14](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.13...v0.1.14) (2025-06-19)


### 📝 문서

* 이슈 템플릿 추가 ([ad9b5ff](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/ad9b5ffd9787bd808533abbdf25cd35babdfade0))
* add issue templates ([4605041](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/4605041a3e4a7a4ba5d9386b017e76e1f99b5c4a))
* add issue templates ([9f82ad6](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/9f82ad687acfa8e7a3be9b71abc66f5c8ca6202f))


### ✨ 새로운 기능

* EventManager 클래스를 추가하고 FaceDetectionSDK에서 이벤트 관리 로직을 통합하여 콜백 처리 방식을 개선함 ([53d257a](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/53d257aa8f8f1c2fad648aa8b73e5dc81b483785))
* FaceDetectionSDK 클래스 및 ConfigManager 추가, 경로 수정 ([b09d199](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/b09d19984cc4a76bce50805b92963ea90aa053ab))
* FaceDetectionSDK에 상태 관리 기능을 추가하고 StateManager 클래스를 구현하여 상태 전환 및 확인 로직을 개선함 ([df11d23](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/df11d23775ccd200e8fd8a999463503d92dfaacb))
* MediapipeManager 클래스를 추가하여 FaceDetectionSDK에서 MediaPipe 관련 로직을 분리하고 초기화 및 결과 처리 방식을 개선함 ([d4522b8](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/d4522b8f7c02fd3e9329c33beb5f9b23fe3559e1))


### ♻️ 코드 리팩토링

* 불필요한 공백 제거 ([89b7cc6](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/89b7cc6fa71a92af31a8cfe2c8ac88b8feef1a6e))
* 불필요한 메서드 및 주석을 제거하여 ConfigManager, EventManager, FacePositionManager, MeasurementManager, MediapipeManager, StateManager, WebcamManager, WorkerManager 클래스를 정리함. 코드 가독성을 개선하고 유지보수를 용이하게 함. ([0264e14](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/0264e14e8cbdb030a1a10b4876f7a4f14d419949))
* FaceDetectionSDK 및 관련 매니저 클래스를 모듈화하여 코드 구조를 개선하고, 상수 및 타입 정의를 통합하여 가독성을 향상시킴. 새로운 index.ts 파일을 추가하여 매니저 및 유틸리티 함수의 내보내기를 정리함. ([72972f1](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/72972f1b6a0e3b926631b845ea22bff5ab3de825))
* FaceDetectionSDK 및 관련 매니저 클래스에서 이벤트 기반 구조로 변경하여 코드의 가독성과 유지보수성을 개선함. MeasurementManager, WebcamManager, WorkerManager, StateManager의 이벤트 인터페이스를 도입하고, 상태 변경 및 에러 처리를 효율적으로 관리하도록 수정함. ([6c91335](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/6c9133547ac02b89dcffb802d40c7d987edcc5e6))
* FaceDetectionSDK 및 StateManager의 상태 변경 콜백 로직을 개선하고, 불필요한 메서드를 제거하여 코드의 가독성과 유지보수성을 향상시킴. 메서드 접근 제어자를 수정하고, 상태 변경 시 이벤트 처리를 통합함. ([cec593c](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/cec593c5641030445cc80aa6f7e75006c6dcc3b4))
* FaceDetectionSDK 클래스의 구조를 개선하고 상수 및 상태 관리 메서드를 추가하여 코드의 가독성과 유지보수성을 향상시킴. 얼굴 인식 관련 메서드를 정리하고, 초기화 및 상태 전환 로직을 명확히 함. ([a4e7907](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/a4e790748666d20fe25987dc3bcb1d6e5922d99c))
* FaceDetectionSDK에 WebcamManager, FacePositionManager, WorkerManager 및 MeasurementManager 클래스를 추가하여 웹캠 관리, 얼굴 위치 업데이트, 데이터 측정 및 워커 처리 기능을 개선함. 기존 코드에서 불필요한 부분을 제거하고, 상태 관리 및 에러 처리를 개선함. ([71b6b23](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/71b6b23f6f0b26839c9c26eb97601e38c3ec071c))
* FaceDetectionSDK의 구조를 개선하고 불필요한 매니저 클래스를 제거하여 코드의 가독성과 유지보수성을 향상시킴. 상태 관리 및 이벤트 처리 로직을 통합하고, MediaPipe 및 웹캠 관련 기능을 직접 처리하도록 수정함. ([826ae02](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/826ae021eeaded0700b80b493681895084a92c66))
* FaceDetectionSDK의 상태 관리 및 이벤트 처리 로직을 개선하여 코드의 가독성과 유지보수성을 향상시킴. 얼굴 인식 및 측정 시작 메서드를 통합하고, 오류 처리 및 상태 전환 로직을 명확히 함. ([3266d84](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/3266d84eb53550108eef7f648319507f0b3c909a))
* README 및 예제 코드에서 SDK 초기화 및 측정 시작을 통합하는 메서드 'initializeAndStart'로 변경하여 사용법을 간소화함. 관련 주석 및 로그 메시지를 업데이트함. ([63594ba](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/63594bae194ad346cde3fee7c1aeb7e49d329c36))


### 🔧 기타 수정

* README 및 예제 코드에서 메서드 시그니처를 수정하고, 불필요한 메서드를 제거하여 코드의 가독성과 일관성을 향상시킴. 이벤트 콜백의 타입을 개선하고, SDK 초기화 및 상태 관리 메서드를 정리함. ([43b574c](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/43b574c016b50ca2cac0814502e9984b2b07a4ce))

### [0.1.13](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.4...v0.1.13) (2025-06-13)


### 🔧 기타 수정

* 버전 0.1.12로 업데이트 ([e75133b](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/e75133b5362ab510de8de5a4a1f5e08b5784fc7a))
* 버전 0.1.5로 업데이트 및 CHANGELOG 수정 ([4ef813a](https://github.com/deep-medi/FaceDetection_Web_SDK/commit/4ef813a8ad9de984c94d45961b48c703165929db))

## [0.1.12](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.5...v0.1.12) (2025-06-13)

### 변경됨

- 버전 업데이트 (0.1.5 → 0.1.12)

## [0.1.5](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.4...v0.1.5) (2025-06-13)

### 변경됨

- 버전 업데이트 (0.1.4 → 0.1.5)

## [0.1.4](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.3...v0.1.4) (2025-06-13)

### 추가됨

- CHANGELOG 자동 생성 기능 추가
- 버전 관리 시스템 개선

## [0.1.3](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.2...v0.1.3) (2025-06-09)

## [0.1.2](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.1...v0.1.2) (2025-06-05)

## [0.1.1](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.0...v0.1.1) (2024-06-05)

### 추가됨

- SDK 버전 정보 출력 기능 추가
  - `FaceDetectionSDK.VERSION` 정적 속성
  - `SDK_VERSION` export 상수
  - `getVersion()` 인스턴스 메서드
  - SDK 초기화 시 자동 버전 로그 출력

### 변경됨

- 예제 데모에서 SDK 버전 정보 표시
- README.md 내용 개선 및 업데이트

### 수정됨

- package.json에서 스코프드 패키지명 제거 (`@deep-medi/face-detection-web-sdk` → `face-detection-web-sdk`)
- vite.config.ts alias 설정 업데이트

## [0.1.0](https://github.com/deep-medi/FaceDetection_Web_SDK/releases/tag/v0.1.0) (2024-06-05)

### 추가됨

- 초기 릴리즈
- 실시간 얼굴 인식 기능 (MediaPipe 기반)
- 비접촉 RGB 데이터 추출
- 상태 관리 시스템 (INITIAL → READY → MEASURING → COMPLETED)
- 크로스 플랫폼 지원 (Chrome, Safari)
- TypeScript 지원
- 기본 사용 예제 (`examples/basic-demo/`)
- 포괄적인 오류 처리
- 설정 가능한 SDK 옵션
- 이벤트 기반 콜백 시스템

### 기능

- 얼굴 감지 및 위치 추적
- 원형 가이드 프레임 내 얼굴 위치 확인
- RGB 데이터 자동 수집 및 처리
- 측정 진행률 실시간 표시
- 데이터 다운로드 기능 (플랫폼별 최적화)
- 웹캠 접근 및 권한 관리
- Web Worker를 통한 비동기 데이터 처리

[출시되지 않음]: https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/deep-medi/FaceDetection_Web_SDK/releases/tag/v0.1.0
