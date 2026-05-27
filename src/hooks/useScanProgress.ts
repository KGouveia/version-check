import { useCallback, useState } from 'react';
import type { ScanProgress } from '../types';

export const useScanProgress = () => {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  const runWithProgress = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setProgress(null);
    const unsubscribe = window.versionTracker.onScanProgress(setProgress);

    try {
      return await fn();
    } finally {
      unsubscribe();
      setProgress(null);
    }
  }, []);

  return { progress, runWithProgress };
};
