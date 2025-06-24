import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceDetectionSDK } from '../../core';
import {
  FaceDetectionSDKConfig,
  SDKEventCallbacks,
  FaceDetectionState,
  MeasurementResult,
  FaceDetectionError,
} from '../../types';

export const useFaceDetection = (
  config: FaceDetectionSDKConfig = {},
  callbacks?: SDKEventCallbacks,
) => {
  const [sdk, setSdk] = useState<FaceDetectionSDK | null>(null);
  const [state, setState] = useState<FaceDetectionState>(FaceDetectionState.INITIAL);
  const [progress, setProgress] = useState<number>(0);
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(false);
  const [isFaceInCircle, setIsFaceInCircle] = useState<boolean>(false);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);
  const [error, setError] = useState<FaceDetectionError | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const sdkRef = useRef<FaceDetectionSDK | null>(null);
  const elementsRef = useRef<any>(null);

  // SDK 초기화 (elements가 없을 때)
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // 콜백 함수들을 래핑하여 상태 업데이트
        const wrappedCallbacks: SDKEventCallbacks = {
          onStateChange: (newState, previousState) => {
            setState(newState);
            callbacks?.onStateChange?.(newState, previousState);
          },
          onMeasurementComplete: (result) => {
            setMeasurementResult(result);
            callbacks?.onMeasurementComplete?.(result);
          },
          onError: (error) => {
            setError(error);
            callbacks?.onError?.(error);
          },
          onProgress: (progress, dataLength) => {
            setProgress(progress);
            callbacks?.onProgress?.(progress, dataLength);
          },
          onFaceDetectionChange: (detected, boundingBox) => {
            setIsFaceDetected(detected);
            callbacks?.onFaceDetectionChange?.(detected, boundingBox);
          },
          onFacePositionChange: (isInCircle) => {
            setIsFaceInCircle(isInCircle);
            callbacks?.onFacePositionChange?.(isInCircle);
          },
          onCountdown: (remainingSeconds, totalSeconds) => {
            callbacks?.onCountdown?.(remainingSeconds, totalSeconds);
          },
        };

        // elements가 없으면 기본 config로 SDK 생성
        const faceDetectionSDK = new FaceDetectionSDK(config, wrappedCallbacks);

        sdkRef.current = faceDetectionSDK;
        setSdk(faceDetectionSDK);
        setIsReady(true);
      } catch (error) {
        console.error('[useFaceDetection] SDK 초기화 실패:', error);
      }
    };

    initializeSDK();
  }, [config, callbacks]);

  // setElements 함수를 useCallback으로 감싸서 무한 루프 방지
  const setElements = useCallback(
    async (elements: any) => {
      if (!sdkRef.current) {
        console.error('[useFaceDetection] SDK가 아직 준비되지 않음');
        return;
      }

      try {
        // elements를 ref에 저장
        elementsRef.current = elements;

        // 기존 SDK를 정리하고 elements가 포함된 새로운 SDK 생성
        sdkRef.current.dispose();

        // 콜백 함수들을 래핑하여 상태 업데이트
        const wrappedCallbacks: SDKEventCallbacks = {
          onStateChange: (newState, previousState) => {
            setState(newState);
            callbacks?.onStateChange?.(newState, previousState);
          },
          onMeasurementComplete: (result) => {
            setMeasurementResult(result);
            callbacks?.onMeasurementComplete?.(result);
          },
          onError: (error) => {
            setError(error);
            callbacks?.onError?.(error);
          },
          onProgress: (progress, dataLength) => {
            setProgress(progress);
            callbacks?.onProgress?.(progress, dataLength);
          },
          onFaceDetectionChange: (detected, boundingBox) => {
            setIsFaceDetected(detected);
            callbacks?.onFaceDetectionChange?.(detected, boundingBox);
          },
          onFacePositionChange: (isInCircle) => {
            setIsFaceInCircle(isInCircle);
            callbacks?.onFacePositionChange?.(isInCircle);
          },
          onCountdown: (remainingSeconds, totalSeconds) => {
            callbacks?.onCountdown?.(remainingSeconds, totalSeconds);
          },
        };

        // elements가 포함된 새로운 config로 SDK 생성
        const newConfig = {
          ...config,
          elements: elements,
        };

        const newSdk = new FaceDetectionSDK(newConfig, wrappedCallbacks);
        sdkRef.current = newSdk;
        setSdk(newSdk);

        // 자동으로 초기화 및 시작
        if (!isInitialized) {
          await newSdk.initializeAndStart();
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[useFaceDetection] setElements 실행 중 오류:', error);
      }
    },
    [config, callbacks, isInitialized],
  );

  // 초기화 및 시작 함수
  const initializeAndStart = useCallback(async () => {
    if (!sdkRef.current) {
      console.error('[useFaceDetection] SDK가 아직 준비되지 않음');
      return;
    }

    try {
      await sdkRef.current.initializeAndStart();
    } catch (error) {
      console.error('[useFaceDetection] initializeAndStart 실패:', error);
    }
  }, []);

  // 정리 함수
  const dispose = useCallback(() => {
    if (sdkRef.current) {
      sdkRef.current.dispose();
      sdkRef.current = null;
      setSdk(null);
      setIsReady(false);
      setIsInitialized(false);
      elementsRef.current = null;
    }
  }, []);

  return {
    sdk,
    state,
    progress,
    isFaceDetected,
    isFaceInCircle,
    measurementResult,
    error,
    isReady,
    isInitialized,
    setElements,
    initializeAndStart,
    dispose,
  };
};
