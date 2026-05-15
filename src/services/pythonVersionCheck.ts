import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { compareVersions, normalizeVersion } from './semver';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);
const pythonReleasesUrl =
  'https://www.python.org/api/v2/downloads/release/?pre_release=false';
const pythonDownloadUrl = 'https://www.python.org/downloads/';

interface PythonOrgRelease {
  name: string;
  version: number;
  pre_release: boolean;
}

const pythonVersionFromStdout = (stdout: string): string | null => {
  const match = stdout.match(/Python\s+(3\.\d+\.\d+)/i);
  return match?.[1] ?? null;
};

const tryExecPythonVersion = async (
  command: string,
  args: string[],
): Promise<string> => {
  const { stdout } = await execFileAsync(command, args, { shell: false });
  const parsed = pythonVersionFromStdout(stdout);

  if (!parsed) {
    throw new Error('Unable to parse Python version output.');
  }

  return parsed;
};

const getLocalPythonVersion = async (): Promise<string> => {
  const attempts: Array<[string, string[]]> = [
    ['python3', ['-V']],
    ['python', ['-V']],
  ];

  if (process.platform === 'win32') {
    attempts.push(['py', ['-3', '-V']], ['py', ['-V']]);
  }

  let lastError: unknown;

  for (const [command, args] of attempts) {
    try {
      return await tryExecPythonVersion(command, args);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const cpythonThreeSemverPattern = /^Python 3\.\d+\.\d+$/;

const collectStableCpython3Semvers = (releases: PythonOrgRelease[]): string[] => {
  const candidates: string[] = [];

  for (const release of releases) {
    if (!release || typeof release.name !== 'string') {
      continue;
    }

    if (release.pre_release || release.version !== 3) {
      continue;
    }

    if (!cpythonThreeSemverPattern.test(release.name)) {
      continue;
    }

    const match = release.name.match(/Python\s+(3\.\d+\.\d+)/i);
    const candidate = match?.[1];

    if (!candidate) {
      continue;
    }

    candidates.push(candidate);
  }

  return candidates;
};

const resolveLatestFromCandidates = (candidates: string[]): string | null => {
  let best: string | null = null;

  for (const candidate of candidates) {
    if (!best || compareVersions(candidate, best) > 0) {
      best = candidate;
    }
  }

  return best;
};

/** e.g. "3.13.3" -> "3.13." so we never conflate 3.1.x with 3.13.x (numeric pair compares can). */
const pythonSameReleaseLinePrefix = (current: string): string | null => {
  const core = normalizeVersion(current).split('-')[0]?.split('+')[0] ?? '';
  const match = core.match(/^(\d+\.\d+)\./);

  return match?.[1] ? `${match[1]}.` : null;
};

const latestOnSameReleaseLine = (current: string, candidates: string[]): string | null => {
  const prefix = pythonSameReleaseLinePrefix(current);

  if (!prefix) {
    return null;
  }

  let best: string | null = null;

  for (const candidate of candidates) {
    const normalized = normalizeVersion(candidate).split('-')[0]?.split('+')[0] ?? '';

    if (!normalized.startsWith(prefix)) {
      continue;
    }

    if (!best || compareVersions(candidate, best) > 0) {
      best = candidate;
    }
  }

  return best;
};

const fetchCpython3VersionInfo = async (
  currentVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const response = await fetch(pythonReleasesUrl);

  if (!response.ok) {
    throw new Error(`Python.org releases API returned HTTP ${response.status}.`);
  }

  const releases = (await response.json()) as PythonOrgRelease[];
  const candidates = collectStableCpython3Semvers(releases);
  const latestVersion = resolveLatestFromCandidates(candidates);

  if (!latestVersion) {
    throw new Error('No stable CPython 3.x release was found.');
  }

  const latestSameReleaseLineVersion = currentVersion
    ? latestOnSameReleaseLine(currentVersion, candidates)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};

export const checkPythonVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;

  try {
    currentVersion = await getLocalPythonVersion();
  } catch {
    errors.push('Unable to run Python (-V / py -V).');
  }

  try {
    const info = await fetchCpython3VersionInfo(currentVersion);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch {
    errors.push('Unable to fetch the latest CPython 3.x release.');
  }

  const status =
    currentVersion && latestVersion
      ? resolveBehindTierForKind('python', currentVersion, latestVersion)
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: pythonDownloadUrl,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
