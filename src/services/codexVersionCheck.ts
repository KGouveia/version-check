import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { resolveBehindTierForKind } from './versionKindTiers';
import { fetchNpmVersionInfo, npmPackagePageUrl } from './npmRegistry';

const execFileAsync = promisify(execFile);
const codexPackageName = '@openai/codex';

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
    const info = await fetchNpmVersionInfo(codexPackageName, currentVersion);
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
    downloadUrl: npmPackagePageUrl(codexPackageName),
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
