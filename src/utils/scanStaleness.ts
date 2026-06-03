import type { TrackedSoftware } from '../types';

export const STALE_SCAN_MS = 12 * 60 * 60 * 1000;

export const getLastScanAt = (software: TrackedSoftware[]): string | null => {
  let latest: string | null = null;
  let latestMs = -Infinity;

  for (const item of software) {
    if (!item.lastCheckedAt) {
      continue;
    }

    const ms = new Date(item.lastCheckedAt).getTime();

    if (ms > latestMs) {
      latestMs = ms;
      latest = item.lastCheckedAt;
    }
  }

  return latest;
};

export const isScanStale = (lastScanAt: string | null): boolean => {
  if (!lastScanAt) {
    return true;
  }

  return Date.now() - new Date(lastScanAt).getTime() > STALE_SCAN_MS;
};
