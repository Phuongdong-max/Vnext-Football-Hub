import { useEffect, useState } from 'react';

export function useCanRender3D(): boolean {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCanRender(false);
      return;
    }

    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    const isLowEndDevice =
      (deviceMemory !== undefined && deviceMemory < 4) ||
      (hardwareConcurrency !== undefined && hardwareConcurrency <= 4);
    if (isLowEndDevice) {
      setCanRender(false);
      return;
    }

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      setCanRender(Boolean(gl));
    } catch {
      setCanRender(false);
    }
  }, []);

  return canRender;
}
