import { attachOsvVulnerabilityCounts } from './osvVulnerabilities';

export interface OsvNpmPackageVersion {
  name: string;
  version: string;
}

export const attachOsvNpmVulnerabilityCounts = async <T extends { name: string }>(
  items: T[],
  getVersion: (item: T) => string | null,
): Promise<{ items: Array<T & { vulnerabilityCount: number | null }>; error: string | null }> =>
  attachOsvVulnerabilityCounts('npm', items, getVersion);
