import React, { useRef } from 'react';
import { useFaceDetectionContext } from '../context/FaceDetectionContext';
import { FaceDetectionContainerProps } from '../types/react';
import './FaceDetectionContainer.css';

export const FaceDetectionContainer: React.FC<FaceDetectionContainerProps> = ({
  className = '',
  style,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={`face-detection-container ${className}`} style={style}>
      {children}
    </div>
  );
};
