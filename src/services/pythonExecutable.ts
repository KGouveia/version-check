import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const pythonVersionFromStdout = (stdout: string): string | null => {
  const match = stdout.match(/Python\s+(3\.\d+\.\d+)/i);
  return match?.[1] ?? null;
};

export const getPythonCommandAttempts = (): Array<[string, string[]]> => {
  const attempts: Array<[string, string[]]> = [
    ['python', ['-V']],
    ['python3', ['-V']],
  ];

  if (process.platform === 'win32') {
    attempts.push(['py', ['-3', '-V']], ['py', ['-V']]);
  }

  return attempts;
};

export const formatPythonCommandLabel = (command: string, args: string[]): string => {
  if (args.length === 0) {
    return command;
  }

  return `${command} ${args.join(' ')}`;
};

export const pipRunnerArgs = (versionArgs: string[]): string[] =>
  versionArgs.filter((arg) => arg !== '-V');

export const formatPythonPipInvoke = (command: string, versionArgs: string[]): string => {
  const runnerArgs = pipRunnerArgs(versionArgs);
  const base = runnerArgs.length > 0 ? `${command} ${runnerArgs.join(' ')}` : command;

  return `${base} -m pip`;
};

export const formatPythonProjectLabel = (
  command: string,
  version: string | null,
): string => {
  if (version) {
    return `Python ${version} (${command})`;
  }

  return command;
};

const tryExecPythonVersion = async (command: string, args: string[]): Promise<string> => {
  const { stdout } = await execFileAsync(command, args, { shell: false });
  const parsed = pythonVersionFromStdout(stdout);

  if (!parsed) {
    throw new Error('Unable to parse Python version output.');
  }

  return parsed;
};

export const getLocalPythonVersion = async (): Promise<string> => {
  let lastError: unknown;

  for (const [command, args] of getPythonCommandAttempts()) {
    try {
      return await tryExecPythonVersion(command, args);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export interface ResolvedPythonExecutable {
  command: string;
  versionArgs: string[];
  version: string | null;
}

export const resolvePythonExecutable = async (): Promise<ResolvedPythonExecutable> => {
  let lastError: unknown;

  for (const [command, versionArgs] of getPythonCommandAttempts()) {
    try {
      const version = await tryExecPythonVersion(command, versionArgs);
      return { command, versionArgs, version };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};
