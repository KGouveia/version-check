import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isValidPypiPackageName } from '../constants/pypiPackageName';
import { assertSafeGlobalPipUpgradeSpec } from './globalPipUpgradePolicy';
import { pipRunnerArgs, resolvePythonExecutable } from './pythonExecutable';

const execFileAsync = promisify(execFile);

export const upgradeGlobalPipPackage = async (
  packageName: string,
  targetVersion: string,
): Promise<void> => {
  const trimmed = packageName.trim();

  if (!isValidPypiPackageName(trimmed)) {
    throw new Error('Invalid PyPI package name.');
  }

  assertSafeGlobalPipUpgradeSpec(targetVersion);

  const { command, versionArgs } = await resolvePythonExecutable();
  const runnerArgs = pipRunnerArgs(versionArgs);
  const pipArgs = [...runnerArgs, '-m', 'pip', 'install', '--upgrade', `${trimmed}==${targetVersion}`];

  try {
    await execFileAsync(command, pipArgs, { shell: false });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to upgrade the pip package.';

    throw new Error(message, err instanceof Error ? { cause: err } : undefined);
  }
};
