import React, { Suspense } from 'react';
import { useCanRender3D } from './useCanRender3D';

interface Scene3DBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}

export const Scene3DBoundary: React.FC<Scene3DBoundaryProps> = ({ children, fallback, className }) => {
  const canRender3D = useCanRender3D();

  if (!canRender3D) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </div>
  );
};
