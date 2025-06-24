import {
  FaceDetectionSDKConfig,
  SDKEventCallbacks,
  FaceDetectionState,
  MeasurementResult,
  FaceDetectionError,
} from '../../types';

// Provider Props 타입
export interface FaceDetectionProviderProps extends SDKEventCallbacks {
  /** SDK 설정 */
  config?: FaceDetectionSDKConfig;
  /** 자식 컴포넌트 */
  children: React.ReactNode;
}

// Container Props 타입
export interface FaceDetectionContainerProps {
  /** 추가 CSS 클래스 */
  className?: string;
  /** 추가 스타일 */
  style?: React.CSSProperties;
  /** 자식 컴포넌트 */
  children?: React.ReactNode;
}

// Progress Bar Props 타입
export interface ProgressBarProps {
  /** 추가 CSS 클래스 */
  className?: string;
  /** 추가 스타일 */
  style?: React.CSSProperties;
  /** 자식 컴포넌트 */
  children?: React.ReactNode;
}

// Context 타입
export interface FaceDetectionContextType {
  /** SDK 인스턴스 */
  sdk: any | null;
  /** 현재 상태 */
  state: FaceDetectionState;
  /** 측정 진행률 */
  progress: number;
  /** 얼굴 감지 여부 */
  isFaceDetected: boolean;
  /** 얼굴이 원 안에 있는지 여부 */
  isFaceInCircle: boolean;
  /** 측정 결과 */
  measurementResult: MeasurementResult | null;
  /** 오류 정보 */
  error: FaceDetectionError | null;
  /** DOM 요소 준비 여부 */
  isReady: boolean;
  /** DOM 요소 설정 함수 */
  setElements: (elements: {
    video: HTMLVideoElement;
    canvasElement: HTMLCanvasElement;
    videoCanvas: HTMLCanvasElement;
    container: HTMLElement;
  }) => void;
  /** 초기화 및 시작 */
  initializeAndStart: () => Promise<void>;
  /** 정리 */
  dispose: () => void;
}
