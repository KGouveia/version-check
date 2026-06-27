import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isValidPypiPackageName } from '../constants/pypiPackageName';
import { pipRunnerArgs, resolvePythonExecutable } from './pythonExecutable';

const execFileAsync = promisify(execFile);

export const uninstallGlobalPipPackage = async (packageName: string): Promise<void> => {
  const trimmed = packageName.trim();

  if (!isValidPypiPackageName(trimmed)) {
    throw new Error('Invalid PyPI package name.');
  }

  const { command, versionArgs } = await resolvePythonExecutable();
  const runnerArgs = pipRunnerArgs(versionArgs);
  const pipArgs = [...runnerArgs, '-m', 'pip', 'uninstall', '-y', trimmed];

  try {
    await execFileAsync(command, pipArgs, { shell: false });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to uninstall the pip package.';

    throw new Error(message, err instanceof Error ? { cause: err } : undefined);
  }
};
