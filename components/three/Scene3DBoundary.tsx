import React, { Suspense } from 'react';
import { useCanRender3D } from './useCanRender3D';

interface Scene3DBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class Scene3DErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const Scene3DBoundary: React.FC<Scene3DBoundaryProps> = ({ children, fallback, className }) => {
  const canRender3D = useCanRender3D();

  if (!canRender3D) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <Scene3DErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>{children}</Suspense>
      </Scene3DErrorBoundary>
    </div>
  );
};
