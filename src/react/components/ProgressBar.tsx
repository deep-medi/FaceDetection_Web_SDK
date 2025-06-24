import React from 'react';
import { ProgressBarProps } from '../types/react';

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = '', style, children }) => {
  return (
    <div className={`progress-bar ${className}`} style={{ ...style }}>
      {children}
    </div>
  );
};
