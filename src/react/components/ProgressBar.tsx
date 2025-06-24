import React from 'react';
import { ProgressBarProps } from '../types/react';
import './ProgressBar.css';

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = '', style, children }) => {
  return (
    <div
      className={`progress-bar ${className}`}
      style={{
        borderColor: '#ffffff',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
