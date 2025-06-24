import React, { useMemo, useCallback } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { FaceDetectionContextProvider } from '../context/FaceDetectionContext';
import { FaceDetectionProviderProps } from '../types/react';

export const FaceDetectionProvider: React.FC<FaceDetectionProviderProps> = ({
  config,
  children,
  onStateChange,
  onMeasurementComplete,
  onError,
  onProgress,
  onFaceDetectionChange,
  onFacePositionChange,
  onCountdown,
}) => {
  const callbacks = useMemo(
    () => ({
      onStateChange,
      onMeasurementComplete,
      onError,
      onProgress,
      onFaceDetectionChange,
      onFacePositionChange,
      onCountdown,
    }),
    [
      onStateChange,
      onMeasurementComplete,
      onError,
      onProgress,
      onFaceDetectionChange,
      onFacePositionChange,
      onCountdown,
    ],
  );

  const hookResult = useFaceDetection(config, callbacks);

  // setElements 함수를 안정화
  const stableSetElements = useCallback(hookResult.setElements, [hookResult.setElements]);
  const stableInitializeAndStart = useCallback(hookResult.initializeAndStart, [
    hookResult.initializeAndStart,
  ]);
  const stableDispose = useCallback(hookResult.dispose, [hookResult.dispose]);

  // context value를 useMemo로 안정화
  const contextValue = useMemo(
    () => ({
      sdk: hookResult.sdk,
      state: hookResult.state,
      progress: hookResult.progress,
      isFaceDetected: hookResult.isFaceDetected,
      isFaceInCircle: hookResult.isFaceInCircle,
      measurementResult: hookResult.measurementResult,
      error: hookResult.error,
      isReady: hookResult.isReady,
      setElements: stableSetElements,
      initializeAndStart: stableInitializeAndStart,
      dispose: stableDispose,
    }),
    [
      hookResult.sdk,
      hookResult.state,
      hookResult.progress,
      hookResult.isFaceDetected,
      hookResult.isFaceInCircle,
      hookResult.measurementResult,
      hookResult.error,
      hookResult.isReady,
      stableSetElements,
      stableInitializeAndStart,
      stableDispose,
    ],
  );

  return (
    <FaceDetectionContextProvider value={contextValue}>{children}</FaceDetectionContextProvider>
  );
};
