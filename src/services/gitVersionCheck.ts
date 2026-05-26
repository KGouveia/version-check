import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import {
  compareGitForWindowsVersions,
  gitSameReleaseLinePrefix,
  parseGitForWindowsVersion,
} from './gitVersionNormalize';
import { proxyFetch } from './proxyNetwork';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);
const gitDownloadUrl = 'https://git-scm.com/download/win';
const gitForWindowsReleasesApi =
  'https://api.github.com/repos/git-for-windows/git/releases';

interface GitHubRelease {
  tag_name?: string;
  prerelease?: boolean;
}

const parseGitVersionOutput = (stdout: string): string => {
  const parsed = parseGitForWindowsVersion(stdout);

  if (!parsed) {
    throw new Error('Unable to parse git --version output.');
  }

  return parsed;
};

const getLocalGitVersion = async (): Promise<string> => {
  const env = { ...process.env } as NodeJS.ProcessEnv;

  try {
    const result = await execFileAsync('git', ['--version'], { shell: false, env });

    return parseGitVersionOutput(`${result.stdout ?? ''}`);
  } catch {
    if (process.platform !== 'win32') {
      throw new Error('Unable to run git --version.');
    }
  }

  const comSpec = env.ComSpec || 'cmd.exe';
  const result = await execFileAsync(comSpec, ['/d', '/s', '/c', 'git --version'], {
    shell: false,
    windowsHide: true,
    env,
  });

  return parseGitVersionOutput(`${result.stdout ?? ''}`);
};

const parseStableGitForWindowsTag = (tagName: string): string | null =>
  parseGitForWindowsVersion(tagName.trim());

const isStableGitForWindowsRelease = (release: GitHubRelease): boolean => {
  if (release.prerelease || typeof release.tag_name !== 'string') {
    return false;
  }

  return parseStableGitForWindowsTag(release.tag_name) !== null;
};

const fetchGitForWindowsGitHubReleases = async (): Promise<GitHubRelease[]> => {
  const releases: GitHubRelease[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const url = new URL(gitForWindowsReleasesApi);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const response = await proxyFetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Software-Version-Tracker',
      },
    });

    if (!response.ok) {
      throw new Error(`Git for Windows releases API returned HTTP ${response.status}.`);
    }

    const batch = (await response.json()) as GitHubRelease[];

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    releases.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return releases;
};

const collectStableGitForWindowsVersions = (releases: GitHubRelease[]): string[] => {
  const seen = new Set<string>();

  for (const release of releases) {
    if (!isStableGitForWindowsRelease(release) || typeof release.tag_name !== 'string') {
      continue;
    }

    const version = parseStableGitForWindowsTag(release.tag_name);

    if (version) {
      seen.add(version);
    }
  }

  return [...seen];
};

const resolveLatestFromCandidates = (candidates: string[]): string | null => {
  let best: string | null = null;

  for (const candidate of candidates) {
    if (!best || compareGitForWindowsVersions(candidate, best) > 0) {
      best = candidate;
    }
  }

  return best;
};

const latestOnSameReleaseLine = (current: string, candidates: string[]): string | null => {
  const prefix = gitSameReleaseLinePrefix(current);

  if (!prefix) {
    return null;
  }

  let best: string | null = null;

  for (const candidate of candidates) {
    const core = parseGitForWindowsVersion(candidate)?.split('.windows.')[0] ?? '';

    if (!core.startsWith(prefix)) {
      continue;
    }

    if (!best || compareGitForWindowsVersions(candidate, best) > 0) {
      best = candidate;
    }
  }

  return best;
};

const fetchGitVersionInfo = async (
  currentVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const releases = await fetchGitForWindowsGitHubReleases();
  const candidates = collectStableGitForWindowsVersions(releases);
  const latestVersion = resolveLatestFromCandidates(candidates);

  if (!latestVersion) {
    throw new Error('No stable Git for Windows release was found.');
  }

  const latestSameReleaseLineVersion = currentVersion
    ? latestOnSameReleaseLine(currentVersion, candidates)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};

export const checkGitVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;

  try {
    currentVersion = await getLocalGitVersion();
  } catch {
    errors.push('Unable to run git --version.');
  }

  try {
    const info = await fetchGitVersionInfo(currentVersion);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch {
    errors.push('Unable to fetch the latest Git for Windows release.');
  }

  const status =
    currentVersion && latestVersion
      ? resolveBehindTierForKind('git', currentVersion, latestVersion)
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: gitDownloadUrl,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
