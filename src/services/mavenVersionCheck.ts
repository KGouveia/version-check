import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { compareVersions, normalizeVersion } from './semver';
import { proxyFetch } from './proxyNetwork';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);
const mavenDownloadUrl = 'https://maven.apache.org/download.cgi';
const mavenReleasesApi = 'https://api.github.com/repos/apache/maven/releases';

interface GitHubRelease {
  tag_name?: string;
  prerelease?: boolean;
}

const mavenVersionFromOutput = (output: string): string | null => {
  const match = output.match(/Apache Maven\s+(\d+\.\d+\.\d+)/i);
  return match?.[1] ?? null;
};

/** GUI-launched Electron may inherit a slimmer PATH; honor Maven install env vars when set. */
const childEnvWithMavenBin = (): NodeJS.ProcessEnv => {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  const mavenHome = env.MAVEN_HOME ?? env.M2_HOME;

  if (!mavenHome) {
    return env;
  }

  const bin = path.join(mavenHome, 'bin');
  const current = env.PATH ?? env.Path ?? '';

  if (!current.toLowerCase().includes(bin.toLowerCase())) {
    const next = `${bin}${path.delimiter}${current}`;
    env.PATH = next;
    env.Path = next;
  }

  return env;
};

const parseMavenVersionOutput = (stdout: string, stderr: string): string => {
  const combined = `${stdout ?? ''}${stderr ?? ''}`;
  const parsed = mavenVersionFromOutput(combined);

  if (!parsed) {
    throw new Error('Unable to parse mvn -version output.');
  }

  return parsed;
};

const getLocalMavenVersion = async (): Promise<string> => {
  const env = childEnvWithMavenBin();

  /**
   * Windows: Maven is shipped as mvn.cmd. execFile('mvn', …) uses CreateProcess and does not
   * resolve .cmd shims the way cmd.exe does, so the call fails even when mvn works in a terminal.
   */
  if (process.platform === 'win32') {
    const comSpec = env.ComSpec || 'cmd.exe';
    const result = await execFileAsync(comSpec, ['/d', '/s', '/c', 'mvn -version'], {
      shell: false,
      windowsHide: true,
      env,
    });

    return parseMavenVersionOutput(`${result.stdout ?? ''}`, `${result.stderr ?? ''}`);
  }

  const result = await execFileAsync('mvn', ['-version'], { shell: false, env });

  return parseMavenVersionOutput(`${result.stdout ?? ''}`, `${result.stderr ?? ''}`);
};

const parseStableMaven3Tag = (tagName: string): string | null => {
  const match = tagName.trim().match(/^(?:maven-)?(3\.\d+\.\d+)$/i);
  return match?.[1] ?? null;
};

const isStableMaven3Release = (release: GitHubRelease): boolean => {
  if (release.prerelease || typeof release.tag_name !== 'string') {
    return false;
  }

  const version = parseStableMaven3Tag(release.tag_name);

  if (!version) {
    return false;
  }

  const prerelease = normalizeVersion(version).split('-')[1];

  return !prerelease;
};

const fetchMavenGitHubReleases = async (): Promise<GitHubRelease[]> => {
  const releases: GitHubRelease[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const url = new URL(mavenReleasesApi);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const response = await proxyFetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Software-Version-Tracker',
      },
    });

    if (!response.ok) {
      throw new Error(`Maven releases API returned HTTP ${response.status}.`);
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

const collectStableMaven3Versions = (releases: GitHubRelease[]): string[] => {
  const seen = new Set<string>();

  for (const release of releases) {
    if (!isStableMaven3Release(release) || typeof release.tag_name !== 'string') {
      continue;
    }

    const version = parseStableMaven3Tag(release.tag_name);

    if (version) {
      seen.add(version);
    }
  }

  return [...seen];
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

const mavenSameReleaseLinePrefix = (current: string): string | null => {
  const core = normalizeVersion(current).split('-')[0]?.split('+')[0] ?? '';
  const match = core.match(/^(\d+\.\d+)\./);

  return match?.[1] ? `${match[1]}.` : null;
};

const latestOnSameReleaseLine = (current: string, candidates: string[]): string | null => {
  const prefix = mavenSameReleaseLinePrefix(current);

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

const fetchMavenVersionInfo = async (
  currentVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const releases = await fetchMavenGitHubReleases();
  const candidates = collectStableMaven3Versions(releases);
  const latestVersion = resolveLatestFromCandidates(candidates);

  if (!latestVersion) {
    throw new Error('No stable Apache Maven 3.x release was found.');
  }

  const latestSameReleaseLineVersion = currentVersion
    ? latestOnSameReleaseLine(currentVersion, candidates)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};

export const checkMavenVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;

  try {
    currentVersion = await getLocalMavenVersion();
  } catch {
    errors.push('Unable to run mvn -version.');
  }

  try {
    const info = await fetchMavenVersionInfo(currentVersion);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch {
    errors.push('Unable to fetch the latest stable Apache Maven 3.x release.');
  }

  const status =
    currentVersion && latestVersion
      ? resolveBehindTierForKind('maven', currentVersion, latestVersion)
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: mavenDownloadUrl,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
