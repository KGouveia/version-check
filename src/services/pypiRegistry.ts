import { normalizeVersion } from './semver';

export const normalizePypiPackageName = (packageName: string): string =>
  packageName.trim().toLowerCase().replace(/_/g, '-');

export const pypiPackagePageUrl = (packageName: string): string =>
  `https://pypi.org/project/${encodeURIComponent(normalizePypiPackageName(packageName))}/`;

export const inferPipCompareVersion = (installedVersion: string): string | null => {
  const normalized = normalizeVersion(installedVersion);
  const match = normalized.match(/^(\d+\.\d+\.\d+)/);

  return match?.[1] ?? null;
};
