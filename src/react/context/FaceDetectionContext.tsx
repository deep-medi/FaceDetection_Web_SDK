import React, { createContext, useContext, ReactNode } from 'react';
import { FaceDetectionContextType } from '../types/react';

// Context 생성
const FaceDetectionContext = createContext<FaceDetectionContextType | null>(null);

// Context Provider 컴포넌트
export const FaceDetectionContextProvider: React.FC<{
  value: FaceDetectionContextType;
  children: ReactNode;
}> = ({ value, children }) => {
  return <FaceDetectionContext.Provider value={value}>{children}</FaceDetectionContext.Provider>;
};

// Context 사용 훅
export const useFaceDetectionContext = (): FaceDetectionContextType => {
  const context = useContext(FaceDetectionContext);
  if (!context) {
    throw new Error('useFaceDetectionContext must be used within a FaceDetectionProvider');
  }
  return context;
};
