import { attachOsvVulnerabilityCounts } from './osvVulnerabilities';
import { normalizePypiPackageName } from './pypiRegistry';

export const attachOsvPypiVulnerabilityCounts = async <T extends { name: string }>(
  items: T[],
  getVersion: (item: T) => string | null,
): Promise<{ items: Array<T & { vulnerabilityCount: number | null }>; error: string | null }> =>
  attachOsvVulnerabilityCounts('PyPI', items, getVersion, normalizePypiPackageName);
