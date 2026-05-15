import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { compareVersions, normalizeVersion } from './semver';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);
const codexNpmRegistryUrl = 'https://registry.npmjs.org/@openai%2Fcodex';
const codexDownloadUrl = 'https://www.npmjs.com/package/@openai/codex';

interface NpmPackageMetadata {
  'dist-tags'?: { latest?: string };
  versions?: Record<string, unknown>;
}

const codexVersionFromStdout = (stdout: string): string | null => {
  const match = stdout.match(/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
};

/**
 * npm global binaries on Windows live under %APPDATA%\\npm (codex.cmd). GUI-launched Electron
 * sometimes inherits a slimmer PATH than an interactive shell; ensure that folder is visible.
 */
const childEnvWithNpmGlobalBin = (): NodeJS.ProcessEnv => {
  const env = { ...process.env } as NodeJS.ProcessEnv;

  if (process.platform !== 'win32' || !env.APPDATA) {
    return env;
  }

  const npmBin = path.join(env.APPDATA, 'npm');
  const current = env.PATH ?? env.Path ?? '';

  if (!current.toLowerCase().includes(npmBin.toLowerCase())) {
    const next = `${npmBin}${path.delimiter}${current}`;
    env.PATH = next;
    env.Path = next;
  }

  return env;
};

const getLocalCodexVersion = async (): Promise<string> => {
  const env = childEnvWithNpmGlobalBin();

  /**
   * Windows: global npm CLIs are `name.cmd` shims. `execFile('codex', …)` uses CreateProcess,
   * which does not resolve those the same way PowerShell/cmd do, so the call often fails even
   * when `codex --version` works in a terminal. Run through cmd.exe instead.
   */
  if (process.platform === 'win32') {
    const comSpec = env.ComSpec || 'cmd.exe';
    const { stdout } = await execFileAsync(comSpec, ['/d', '/s', '/c', 'codex --version'], {
      shell: false,
      windowsHide: true,
      env,
    });
    const parsed = codexVersionFromStdout(stdout);

    if (!parsed) {
      throw new Error('Unable to parse Codex CLI version output.');
    }

    return parsed;
  }

  const { stdout } = await execFileAsync('codex', ['--version'], { shell: false, env });
  const parsed = codexVersionFromStdout(stdout);

  if (!parsed) {
    throw new Error('Unable to parse Codex CLI version output.');
  }

  return parsed;
};

const codexSameReleaseLinePrefix = (current: string): string | null => {
  const core = normalizeVersion(current).split('-')[0]?.split('+')[0] ?? '';
  const match = core.match(/^(\d+\.\d+)\./);

  return match?.[1] ? `${match[1]}.` : null;
};

const isStableSemverKey = (key: string): boolean => {
  if (!/^\d+\.\d+\.\d+/.test(key)) {
    return false;
  }

  const prerelease = normalizeVersion(key).split('-')[1];

  return !prerelease;
};

const latestOnSameReleaseLineFromNpmVersions = (
  current: string,
  versionKeys: string[],
): string | null => {
  const prefix = codexSameReleaseLinePrefix(current);

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

const fetchCodexVersionInfo = async (
  currentVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const response = await fetch(codexNpmRegistryUrl);

  if (!response.ok) {
    throw new Error(`npm registry returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as NpmPackageMetadata;
  const latestRaw = data['dist-tags']?.latest;

  if (typeof latestRaw !== 'string' || !latestRaw.trim()) {
    throw new Error('npm registry did not include a latest dist-tag.');
  }

  const latestMatch = latestRaw.match(/^(\d+\.\d+\.\d+)/);
  const latestVersion = latestMatch?.[1] ?? null;

  if (!latestVersion) {
    throw new Error('Unable to parse latest @openai/codex version from npm.');
  }

  const versionKeys = data.versions && typeof data.versions === 'object'
    ? Object.keys(data.versions)
    : [];

  const latestSameReleaseLineVersion = currentVersion
    ? latestOnSameReleaseLineFromNpmVersions(currentVersion, versionKeys)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};

export const checkCodexCliVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;

  try {
    currentVersion = await getLocalCodexVersion();
  } catch {
    errors.push('Unable to run codex --version.');
  }

  try {
    const info = await fetchCodexVersionInfo(currentVersion);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch {
    errors.push('Unable to fetch the latest @openai/codex release from npm.');
  }

  const status =
    currentVersion && latestVersion
      ? resolveBehindTierForKind('codex-cli', currentVersion, latestVersion)
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: codexDownloadUrl,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
