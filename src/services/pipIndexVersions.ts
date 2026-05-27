import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  isStableSemverKey,
  latestOnSameReleaseLineFromNpmVersions,
} from './npmRegistry';
import { pipRunnerArgs, type ResolvedPythonExecutable } from './pythonExecutable';
import { normalizePypiPackageName } from './pypiRegistry';
import { compareVersions } from './semver';

const execFileAsync = promisify(execFile);

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

export const parsePipIndexVersionsOutput = (stdout: string): string[] => {
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*Available versions:\s*(.+)\s*$/i);

    if (!match?.[1]) {
      continue;
    }

    const versions = match[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (versions.length > 0) {
      return versions;
    }
  }

  throw new Error('pip index versions did not list any available versions.');
};

const formatPipExecError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return 'pip index versions failed.';
  }

  const execErr = err as Error & { stderr?: string; stdout?: string };
  const stderr = typeof execErr.stderr === 'string' ? execErr.stderr.trim() : '';
  const stdout = typeof execErr.stdout === 'string' ? execErr.stdout.trim() : '';
  const detail = stderr || stdout;

  if (detail) {
    return detail.split(/\r?\n/)[0] ?? detail;
  }

  return err.message;
};

export const runPipIndexVersions = async (
  command: string,
  versionArgs: string[],
  packageName: string,
): Promise<string> => {
  const normalizedName = normalizePypiPackageName(packageName);
  const args = [
    ...pipRunnerArgs(versionArgs),
    '-m',
    'pip',
    'index',
    'versions',
    normalizedName,
  ];

  try {
    const { stdout } = await execFileAsync(command, args, { shell: false });
    return stdout;
  } catch (err) {
    throw new Error(formatPipExecError(err), err instanceof Error ? { cause: err } : undefined);
  }
};

export const fetchPipIndexVersionInfo = async (
  packageName: string,
  compareVersion: string | null,
  executable: ResolvedPythonExecutable,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const stdout = await runPipIndexVersions(
    executable.command,
    executable.versionArgs,
    packageName,
  );
  const versionKeys = parsePipIndexVersionsOutput(stdout);
  const latestVersion = highestStableVersion(versionKeys);

  if (!latestVersion) {
    throw new Error('pip index did not include a stable release.');
  }

  const latestSameReleaseLineVersion = compareVersion
    ? latestOnSameReleaseLineFromNpmVersions(compareVersion, versionKeys)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};
