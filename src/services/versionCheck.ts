import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';

const execFileAsync = promisify(execFile);
const nodeReleaseIndexUrl = 'https://nodejs.org/dist/index.json';
const nodeDownloadUrl = 'https://nodejs.org/en/download';

interface NodeRelease {
  version: string;
}

const normalizeVersion = (version: string) => version.trim().replace(/^v/i, '');

const parseVersionParts = (version: string): [number, number, number] => {
  const [major = '0', minor = '0', patch = '0'] = normalizeVersion(version).split('.');

  return [
    Number.parseInt(major, 10) || 0,
    Number.parseInt(minor, 10) || 0,
    Number.parseInt(patch, 10) || 0,
  ];
};

const compareVersions = (left: string, right: string): number => {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }

    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
};

const getLocalNodeVersion = async (): Promise<string> => {
  const { stdout } = await execFileAsync('node', ['-v'], { shell: false });
  return stdout.trim();
};

const getLatestNodeVersion = async (): Promise<string> => {
  const response = await fetch(nodeReleaseIndexUrl);

  if (!response.ok) {
    throw new Error(`Node.js release index returned HTTP ${response.status}.`);
  }

  const releases = (await response.json()) as NodeRelease[];
  const latestStableRelease = releases.find(
    (release) =>
      typeof release.version === 'string' && !release.version.includes('-'),
  );

  if (!latestStableRelease) {
    throw new Error('No stable Node.js release was found.');
  }

  return latestStableRelease.version;
};

export const checkNodeVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;

  try {
    currentVersion = await getLocalNodeVersion();
  } catch {
    errors.push('Unable to run node -v.');
  }

  try {
    latestVersion = await getLatestNodeVersion();
  } catch {
    errors.push('Unable to fetch the latest Node.js release.');
  }

  const status =
    currentVersion && latestVersion
      ? compareVersions(currentVersion, latestVersion) >= 0
        ? 'up-to-date'
        : 'outdated'
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    status,
    downloadUrl: nodeDownloadUrl,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
