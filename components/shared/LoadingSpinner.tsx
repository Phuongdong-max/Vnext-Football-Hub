
import React from 'react';
import { SoccerBallIcon } from '../icons'; // Using SoccerBall as a themed spinner

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
    <SoccerBallIcon 
      className={`animate-spin ${sizeClasses[size]} ${color} ${className}`} 
    />
  );
};
    