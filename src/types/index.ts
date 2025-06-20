// 공통 타입 정의들을 중앙에서 관리

// ===== 얼굴 인식 관련 타입 =====
export interface BoundingBox {
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

export interface Detection {
  boundingBox: BoundingBox;
}

export interface CalculatedBoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FacePositionResult {
  isInCircle: boolean;
  distance: number;
  allowedRadius: number;
  progressCenter: {
    x: number;
    y: number;
  };
}

export interface PositionUpdateResult {
  positionErr: number;
  yPositionErr: number;
  lastPosition: number;
  lastYPosition: number;
}

// ===== RGB 데이터 관련 타입 =====
export interface RgbDataObject {
  sigR: number[];
  sigG: number[];
  sigB: number[];
  timestamp: number[];
}

export interface LastRGB {
  timestamp: number;
  r: number | null;
  g: number | null;
  b: number | null;
}

// ===== 워커 관련 타입 =====

// ===== 얼굴 인식 처리 관련 타입 =====
export interface FaceDetectionResults {
  detections?: Detection[];
  image: {
    width: number;
    height: number;
  };
}

export interface ProcessContext {
  isFirstFrame: boolean;
  isFaceDetected: boolean;
  faceDetectionTimer: NodeJS.Timeout | null;
  FACE_DETECTION_TIMEOUT: number;
  handleFaceDetection: (detection: Detection) => void;
  handleNoDetection: () => void;
  mean_red: number[];
}

export interface ProcessResultsReturn {
  isFirstFrame: boolean;
  isFaceDetected: boolean;
  faceDetectionTimer: NodeJS.Timeout | null;
  lastBoundingBox: CalculatedBoundingBox | null;
}

// ===== 플랫폼 관련 타입 =====
export interface PlatformOptions {
  isIOS?: boolean;
  isAndroid?: boolean;
}

// ===== 상태 관리 관련 타입 =====
export interface StateChangeCallback {
  (newState: FaceDetectionState, previousState: FaceDetectionState): void;
}

// ===== FaceDetection SDK 관련 타입 =====

/**
 * 얼굴 인식 SDK 설정 인터페이스
 */
export interface FaceDetectionSDKConfig {
  /** 플랫폼 옵션 */
  platform?: PlatformOptions;

  /** 측정 설정 */
  measurement?: {
    /** 목표 데이터 포인트 수 (기본값: 450) */
    targetDataPoints?: number;
    /** 프레임 처리 간격 (기본값: 33.33ms) */
    frameInterval?: number;
    /** 프레임 처리 주기 (기본값: 30) */
    frameProcessInterval?: number;
    /** ready 상태에서 measuring 상태로 전환하기 전 대기 시간 (초, 기본값: 3) */
    readyToMeasuringDelay?: number;
  };

  /** 얼굴 인식 설정 */
  faceDetection?: {
    /** 얼굴 인식 타임아웃 (기본값: 3000ms) */
    timeout?: number;
    /** 최소 감지 신뢰도 (기본값: 0.5) */
    minDetectionConfidence?: number;
  };

  /** 비디오 설정 */
  video?: {
    /** 비디오 너비 (기본값: 640) */
    width?: number;
    /** 비디오 높이 (기본값: 480) */
    height?: number;
    /** 프레임레이트 (기본값: 30) */
    frameRate?: number;
  };

  /** UI 설정 */
  ui?: {
    /** 컨테이너 요소 ID (기본값: 'face-detection-container') */
    containerId?: string;
    /** 커스텀 CSS 클래스 */
    customClasses?: {
      container?: string;
      video?: string;
      canvas?: string;
      progress?: string;
    };
  };

  /** HTML 요소들 (사용자가 직접 제공) */
  elements?: {
    /** 비디오 요소 */
    video: HTMLVideoElement;
    /** 출력 캔버스 요소 */
    canvasElement: HTMLCanvasElement;
    /** 비디오 캔버스 요소 */
    videoCanvas: HTMLCanvasElement;
    /** 컨테이너 요소 */
    container: HTMLElement;
  };

  /** 서버 설정 */
  server?: {
    /** API 기본 URL */
    baseUrl?: string;
    /** 요청 타임아웃 (기본값: 30000ms) */
    timeout?: number;
  };

  /** 디버그 설정 */
  debug?: {
    /** 디버그 모드 활성화 (기본값: false) */
    enabled?: boolean;
    /** 콘솔 로그 활성화 (기본값: false) */
    enableConsoleLog?: boolean;
  };

  /** 데이터 다운로드 설정 */
  dataDownload?: {
    /** 데이터 다운로드 활성화 (기본값: false) */
    enabled?: boolean;
    /** 자동 다운로드 여부 (기본값: false, false면 새 창에서 사용자 입력으로 다운로드) */
    autoDownload?: boolean;
    /** 다운로드 파일명 (기본값: 'rgb_data.txt') */
    filename?: string;
  };

  /** 에러 바운딩 값 */
  errorBounding?: number;
}

// 상태 관리를 위한 enum 정의
export enum FaceDetectionState {
  INITIAL = 'initial', // 초기 상태 (초기화, 준비, 얼굴 위치 조정 등 모든 초기 과정 포함)
  READY = 'ready', // 측정 준비 완료
  MEASURING = 'measuring', // 측정 중 (RGB 데이터 수집)
  COMPLETED = 'completed', // 측정 완료
}

// 에러 타입 정의
export enum FaceDetectionErrorType {
  FACE_NOT_DETECTED = 'face_not_detected', // 얼굴 인식 실패
  FACE_OUT_OF_CIRCLE = 'face_out_of_circle', // 얼굴이 원 밖에 위치
  WEBCAM_PERMISSION_DENIED = 'webcam_permission_denied', // 웹캠 권한 거부
  WEBCAM_ACCESS_FAILED = 'webcam_access_failed', // 웹캠 접근 실패
  INITIALIZATION_FAILED = 'initialization_failed', // 초기화 실패
  UNKNOWN_ERROR = 'unknown_error', // 알 수 없는 오류
}

// 에러 정보 인터페이스
export interface FaceDetectionError {
  type: FaceDetectionErrorType;
  message: string;
}

/**
 * 측정 결과 인터페이스
 */
export interface MeasurementResult {
  /** 심박수 */
  heartRate?: number;
  /** 수축기 혈압 */
  systolic?: number;
  /** 이완기 혈압 */
  diastolic?: number;
  /** 스트레스 지수 */
  stress?: number;
  /** HRV 지표들 */
  hrv?: {
    RMSSD?: number;
    SDNN?: number;
  };
  /** 원시 RGB 데이터 */
  rawData?: RgbDataObject;
  /** 측정 품질 정보 */
  quality?: {
    positionError: number;
    yPositionError: number;
    dataPoints: number;
  };
}

/**
 * SDK 이벤트 콜백 타입들
 */
export interface SDKEventCallbacks {
  /** 상태 변경 시 호출 */
  onStateChange?: StateChangeCallback;
  /** 측정 완료 시 호출 */
  onMeasurementComplete?: (result: MeasurementResult) => void;
  /** 오류 발생 시 호출 */
  onError?: (error: FaceDetectionError) => void;
  /** 진행률 업데이트 시 호출 */
  onProgress?: (progress: number, dataLength: number) => void;
  /** 얼굴 감지 상태 변경 시 호출 */
  onFaceDetectionChange?: (detected: boolean, boundingBox: CalculatedBoundingBox | null) => void;
  /** 얼굴이 원 안에 있는지 여부 변경 시 호출 */
  onFacePositionChange?: (isInCircle: boolean) => void;
  /** 카운트다운 업데이트 시 호출 */
  onCountdown?: (remainingSeconds: number, totalSeconds: number) => void;
}
