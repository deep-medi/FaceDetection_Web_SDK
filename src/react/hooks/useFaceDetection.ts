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
    console.log('[useFaceDetection] SDK 초기화 시작');

    const initializeSDK = async () => {
      try {
        // 콜백 함수들을 래핑하여 상태 업데이트
        const wrappedCallbacks: SDKEventCallbacks = {
          onStateChange: (newState, previousState) => {
            console.log(`[useFaceDetection] 상태 변경: ${previousState} → ${newState}`);
            setState(newState);
            callbacks?.onStateChange?.(newState, previousState);
          },
          onMeasurementComplete: (result) => {
            console.log('[useFaceDetection] 측정 완료:', result);
            setMeasurementResult(result);
            callbacks?.onMeasurementComplete?.(result);
          },
          onError: (error) => {
            console.error('[useFaceDetection] 오류 발생:', error);
            setError(error);
            callbacks?.onError?.(error);
          },
          onProgress: (progress, dataLength) => {
            console.log(
              `[useFaceDetection] 진행률: ${Math.round(progress * 100)}%, 데이터: ${dataLength}`,
            );
            setProgress(progress);
            callbacks?.onProgress?.(progress, dataLength);
          },
          onFaceDetectionChange: (detected, boundingBox) => {
            console.log(`[useFaceDetection] 얼굴 감지: ${detected}`, boundingBox);
            setIsFaceDetected(detected);
            callbacks?.onFaceDetectionChange?.(detected, boundingBox);
          },
          onFacePositionChange: (isInCircle) => {
            console.log(`[useFaceDetection] 얼굴 위치: ${isInCircle ? '원 안' : '원 밖'}`);
            setIsFaceInCircle(isInCircle);
            callbacks?.onFacePositionChange?.(isInCircle);
          },
          onCountdown: (remainingSeconds, totalSeconds) => {
            console.log(`[useFaceDetection] 카운트다운: ${remainingSeconds}초 남음`);
            callbacks?.onCountdown?.(remainingSeconds, totalSeconds);
          },
        };

        // elements가 없으면 기본 config로 SDK 생성
        const faceDetectionSDK = new FaceDetectionSDK(config, wrappedCallbacks);
        console.log('[useFaceDetection] FaceDetectionSDK 인스턴스 생성됨');

        sdkRef.current = faceDetectionSDK;
        setSdk(faceDetectionSDK);
        setIsReady(true);

        console.log('[useFaceDetection] SDK 초기화 완료');
      } catch (error) {
        console.error('[useFaceDetection] SDK 초기화 실패:', error);
      }
    };

    initializeSDK();
  }, [config, callbacks]);

  // setElements 함수를 useCallback으로 감싸서 무한 루프 방지
  const setElements = useCallback(
    async (elements: any) => {
      console.log('[useFaceDetection] setElements 호출됨');
      console.log('[useFaceDetection] 전달받은 elements:', elements);

      if (!sdkRef.current) {
        console.error('[useFaceDetection] SDK가 아직 준비되지 않음');
        return;
      }

      try {
        // elements를 ref에 저장
        elementsRef.current = elements;

        // 기존 SDK를 정리하고 elements가 포함된 새로운 SDK 생성
        console.log('[useFaceDetection] 기존 SDK 정리 중...');
        sdkRef.current.dispose();

        // 콜백 함수들을 래핑하여 상태 업데이트
        const wrappedCallbacks: SDKEventCallbacks = {
          onStateChange: (newState, previousState) => {
            console.log(`[useFaceDetection] 상태 변경: ${previousState} → ${newState}`);
            setState(newState);
            callbacks?.onStateChange?.(newState, previousState);
          },
          onMeasurementComplete: (result) => {
            console.log('[useFaceDetection] 측정 완료:', result);
            setMeasurementResult(result);
            callbacks?.onMeasurementComplete?.(result);
          },
          onError: (error) => {
            console.error('[useFaceDetection] 오류 발생:', error);
            setError(error);
            callbacks?.onError?.(error);
          },
          onProgress: (progress, dataLength) => {
            console.log(
              `[useFaceDetection] 진행률: ${Math.round(progress * 100)}%, 데이터: ${dataLength}`,
            );
            setProgress(progress);
            callbacks?.onProgress?.(progress, dataLength);
          },
          onFaceDetectionChange: (detected, boundingBox) => {
            console.log(`[useFaceDetection] 얼굴 감지: ${detected}`, boundingBox);
            setIsFaceDetected(detected);
            callbacks?.onFaceDetectionChange?.(detected, boundingBox);
          },
          onFacePositionChange: (isInCircle) => {
            console.log(`[useFaceDetection] 얼굴 위치: ${isInCircle ? '원 안' : '원 밖'}`);
            setIsFaceInCircle(isInCircle);
            callbacks?.onFacePositionChange?.(isInCircle);
          },
          onCountdown: (remainingSeconds, totalSeconds) => {
            console.log(`[useFaceDetection] 카운트다운: ${remainingSeconds}초 남음`);
            callbacks?.onCountdown?.(remainingSeconds, totalSeconds);
          },
        };

        // elements가 포함된 새로운 config로 SDK 생성
        const newConfig = {
          ...config,
          elements: elements,
        };

        console.log('[useFaceDetection] 새로운 SDK 생성 중...');
        const newSdk = new FaceDetectionSDK(newConfig, wrappedCallbacks);
        sdkRef.current = newSdk;
        setSdk(newSdk);

        console.log('[useFaceDetection] SDK에 elements 설정 완료');

        // 자동으로 초기화 및 시작
        if (!isInitialized) {
          console.log('[useFaceDetection] 자동 초기화 및 시작');
          await newSdk.initializeAndStart();
          setIsInitialized(true);
          console.log('[useFaceDetection] 초기화 및 시작 완료');
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
      console.log('[useFaceDetection] initializeAndStart 호출됨');
      await sdkRef.current.initializeAndStart();
      console.log('[useFaceDetection] initializeAndStart 완료');
    } catch (error) {
      console.error('[useFaceDetection] initializeAndStart 실패:', error);
    }
  }, []);

  // 정리 함수
  const dispose = useCallback(() => {
    if (sdkRef.current) {
      console.log('[useFaceDetection] SDK 정리 중...');
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
