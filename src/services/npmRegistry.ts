import { proxyFetch } from './proxyNetwork';
import { compareVersions, normalizeVersion } from './semver';

export interface NpmPackageMetadata {
  'dist-tags'?: { latest?: string };
  versions?: Record<string, unknown>;
}

export const npmRegistryPackageUrl = (packageName: string): string => {
  const encoded = packageName.startsWith('@')
    ? packageName.replace('/', '%2F')
    : packageName;

  return `https://registry.npmjs.org/${encoded}`;
};

export const npmPackagePageUrl = (packageName: string): string =>
  `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;

const sameReleaseLinePrefix = (current: string): string | null => {
  const core = normalizeVersion(current).split('-')[0]?.split('+')[0] ?? '';
  const match = core.match(/^(\d+\.\d+)\./);

  return match?.[1] ? `${match[1]}.` : null;
};

export const isStableSemverKey = (key: string): boolean => {
  if (!/^\d+\.\d+\.\d+/.test(key)) {
    return false;
  }

  const prerelease = normalizeVersion(key).split('-')[1];

  return !prerelease;
};

export const latestOnSameReleaseLineFromNpmVersions = (
  current: string,
  versionKeys: string[],
): string | null => {
  const prefix = sameReleaseLinePrefix(current);

  if (!prefix) {
    return null;
  }

  let best: string | null = null;

  for (const key of versionKeys) {
    if (!isStableSemverKey(key)) {
      continue;
    }

    const core = normalizeVersion(key).split('-')[0]?.split('+')[0] ?? '';

    if (!core.startsWith(prefix)) {
      continue;
    }

    if (!best || compareVersions(key, best) > 0) {
      best = key;
    }
  }

  return best;
};

const parseLatestDistTag = (latestRaw: string): string => {
  const latestMatch = latestRaw.match(/^(\d+\.\d+\.\d+)/);
  const latestVersion = latestMatch?.[1] ?? null;

  if (!latestVersion) {
    throw new Error('Unable to parse latest version from npm dist-tag.');
  }

  return latestVersion;
};

export const fetchNpmVersionInfo = async (
  packageName: string,
  compareVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const response = await proxyFetch(npmRegistryPackageUrl(packageName));

  if (!response.ok) {
    throw new Error(`npm registry returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as NpmPackageMetadata;
  const latestRaw = data['dist-tags']?.latest;

  if (typeof latestRaw !== 'string' || !latestRaw.trim()) {
    throw new Error('npm registry did not include a latest dist-tag.');
  }

  const latestVersion = parseLatestDistTag(latestRaw);
  const versionKeys =
    data.versions && typeof data.versions === 'object' ? Object.keys(data.versions) : [];

  const latestSameReleaseLineVersion = compareVersion
    ? latestOnSameReleaseLineFromNpmVersions(compareVersion, versionKeys)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};
