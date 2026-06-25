import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { compareVersions, parseVersionParts } from './semver';
import { proxyFetch } from './proxyNetwork';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);
const nodeReleaseIndexUrl = 'https://nodejs.org/dist/index.json';
const nodeDownloadUrl = 'https://nodejs.org/en/download';

interface NodeRelease {
  version: string;
}

const getLocalNodeVersion = async (): Promise<string> => {
  const { stdout } = await execFileAsync('node', ['-v'], { shell: false });
  return stdout.trim();
};

/** Latest within the same Node.js major line (e.g. 22.12.0 → latest 22.x). */
const nodeSameMajorLine = (current: string, releases: NodeRelease[]): string | null => {
  const [currentMajor] = parseVersionParts(current);
  let best: string | null = null;

  for (const release of releases) {
    const [major] = parseVersionParts(release.version);

    if (major !== currentMajor) {
      continue;
    }

    if (!best || compareVersions(release.version, best) > 0) {
      best = release.version;
    }
  }

  return best;
};

const fetchNodeVersionInfo = async (
  currentVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const response = await proxyFetch(nodeReleaseIndexUrl);

  if (!response.ok) {
    throw new Error(`Node.js release index returned HTTP ${response.status}.`);
  }

  const releases = (await response.json()) as NodeRelease[];
  const stable = releases.filter(
    (release) => typeof release.version === 'string' && !release.version.includes('-'),
  );

  let latestVersion: string | null = null;

  for (const release of stable) {
    if (!latestVersion || compareVersions(release.version, latestVersion) > 0) {
      latestVersion = release.version;
    }
  }

  if (!latestVersion) {
    throw new Error('No stable Node.js release was found.');
  }

  const latestSameReleaseLineVersion = currentVersion
    ? nodeSameMajorLine(currentVersion, stable)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};

export const checkNodeVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;

  try {
    currentVersion = await getLocalNodeVersion();
  } catch {
    errors.push('Unable to run node -v.');
  }

  try {
    const info = await fetchNodeVersionInfo(currentVersion);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch {
    errors.push('Unable to fetch the latest Node.js release.');
  }

  const status =
    currentVersion && latestVersion
      ? resolveBehindTierForKind('nodejs', currentVersion, latestVersion)
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: nodeDownloadUrl,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
