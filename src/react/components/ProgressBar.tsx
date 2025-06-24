import React from 'react';
import { useFaceDetectionContext } from '../context/FaceDetectionContext';
import { ProgressBarProps } from '../types/react';
import { FaceDetectionState } from '../../types';
import './ProgressBar.css';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  className = '',
  style,
  renderProgress,
  size = 'medium',
  borderColor,
  backgroundColor,
}) => {
  const { state, progress, isFaceDetected, isFaceInCircle, error } = useFaceDetectionContext();

  // 크기 계산
  const getSizeValue = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small':
        return 200;
      case 'large':
        return 300;
      default:
        return 240; // medium
    }
  };

  const sizeValue = getSizeValue();

  // 테두리 색상 결정
  const getBorderColor = () => {
    if (borderColor) return borderColor;

    if (error) return '#ff4444';
    if (isFaceInCircle) return '#44ff44';
    if (isFaceDetected) return '#ffff44';
    return '#ffffff';
  };

  // 커스텀 렌더링 또는 기본 렌더링
  const renderContent = () => {
    if (renderProgress) {
      return renderProgress(progress, state);
    }

    // 기본 렌더링
    switch (state) {
      case FaceDetectionState.INITIAL:
        return <span className="progress-text">초기화 중...</span>;
      case FaceDetectionState.READY:
        return <span className="progress-text">원 안에 얼굴을 위치시켜 주세요</span>;
      case FaceDetectionState.MEASURING:
        return <span className="progress-text">측정 중... {Math.round(progress * 100)}%</span>;
      case FaceDetectionState.COMPLETED:
        return <span className="progress-text">측정 완료!</span>;
      default:
        return <span className="progress-text">준비 중...</span>;
    }
  };

  return (
    <div
      className={`progress-bar ${className}`}
      style={{
        width: sizeValue,
        height: sizeValue,
        borderColor: getBorderColor(),
        backgroundColor,
        ...style,
      }}
    >
      {renderContent()}
    </div>
  );
};
