
import React from 'react';
import { VnfcLogoAnimated } from '../icons'; // Using the animated logo

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string; // Tailwind color class e.g., 'text-primary', 'text-white'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'text-primary' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <VnfcLogoAnimated 
      className={`${sizeClasses[size]} ${className}`} 
    />
  );
};