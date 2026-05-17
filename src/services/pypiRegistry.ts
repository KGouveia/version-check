import {
  isStableSemverKey,
  latestOnSameReleaseLineFromNpmVersions,
} from './npmRegistry';
import { compareVersions, normalizeVersion } from './semver';

export interface PypiPackageMetadata {
  info?: { version?: string };
  releases?: Record<string, unknown>;
}

export const normalizePypiPackageName = (packageName: string): string =>
  packageName.trim().toLowerCase().replace(/_/g, '-');

export const pypiJsonUrl = (packageName: string): string =>
  `https://pypi.org/pypi/${encodeURIComponent(normalizePypiPackageName(packageName))}/json`;

export const pypiPackagePageUrl = (packageName: string): string =>
  `https://pypi.org/project/${encodeURIComponent(normalizePypiPackageName(packageName))}/`;

const parseLatestVersion = (latestRaw: string): string => {
  const latestMatch = latestRaw.match(/^(\d+\.\d+\.\d+)/);
  const latestVersion = latestMatch?.[1] ?? null;

  if (!latestVersion) {
    throw new Error('Unable to parse latest version from PyPI metadata.');
  }

  return latestVersion;
};

const highestStableVersion = (versionKeys: string[]): string | null => {
  let best: string | null = null;

  for (const key of versionKeys) {
    if (!isStableSemverKey(key)) {
      continue;
    }

    if (!best || compareVersions(key, best) > 0) {
      best = key;
    }
  }

  return best;
};

const fetchPypiMetadata = async (packageName: string): Promise<PypiPackageMetadata> => {
  const response = await fetch(pypiJsonUrl(packageName));

  if (!response.ok) {
    throw new Error(`PyPI returned HTTP ${response.status}.`);
  }

  return (await response.json()) as PypiPackageMetadata;
};

export const fetchPypiVersionInfo = async (
  packageName: string,
  compareVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const data = await fetchPypiMetadata(packageName);
  const versionKeys =
    data.releases && typeof data.releases === 'object' ? Object.keys(data.releases) : [];

  const latestRaw = data.info?.version;
  let latestVersion: string | null = null;

  if (typeof latestRaw === 'string' && latestRaw.trim()) {
    try {
      latestVersion = parseLatestVersion(latestRaw.trim());
    } catch {
      latestVersion = highestStableVersion(versionKeys);
    }
  }

  if (!latestVersion) {
    latestVersion = highestStableVersion(versionKeys);
  }

  if (!latestVersion) {
    throw new Error('PyPI metadata did not include a stable release.');
  }

  const latestSameReleaseLineVersion = compareVersion
    ? latestOnSameReleaseLineFromNpmVersions(compareVersion, versionKeys)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};

export const inferPipCompareVersion = (installedVersion: string): string | null => {
  const normalized = normalizeVersion(installedVersion);
  const match = normalized.match(/^(\d+\.\d+\.\d+)/);

  return match?.[1] ?? null;
};
