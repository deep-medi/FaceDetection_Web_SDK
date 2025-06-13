# 변경이력 (CHANGELOG)

이 파일은 face-detection-web-sdk의 모든 주요 변경사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)을 기반으로 하며,
이 프로젝트는 [의미적 버전 관리](https://semver.org/lang/ko/)를 따릅니다.

### [0.1.4](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.3...v0.1.4) (2025-06-13)

## [0.1.3](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.2...v0.1.3) (2025-06-09)

## [0.1.2](https://github.com/deep-medi/FaceDetection_Web_SDK/compare/v0.1.1...v0.1.2) (2025-06-05)

## [0.1.1] - 2024-06-05

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

## [0.1.0] - 2024-06-05

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
