import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PipDependencyInput } from '../types';
import {
  formatPythonCommandLabel,
  formatPythonPipInvoke,
  formatPythonProjectLabel,
  pipRunnerArgs,
  resolvePythonExecutable,
  type ResolvedPythonExecutable,
} from './pythonExecutable';

const execFileAsync = promisify(execFile);

interface PipListEntry {
  name: string;
  version: string;
  editable_project_location?: string;
}

const parsePipListJson = (stdout: string): PipDependencyInput[] => {
  const parsed = JSON.parse(stdout) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('pip list did not return a JSON array.');
  }

  const dependencies: PipDependencyInput[] = [];

  for (const entry of parsed) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof (entry as PipListEntry).name !== 'string' ||
      typeof (entry as PipListEntry).version !== 'string'
    ) {
      continue;
    }

    const { name, version, editable_project_location } = entry as PipListEntry;

    if (typeof editable_project_location === 'string' && editable_project_location.trim()) {
      continue;
    }

    const trimmedName = name.trim();
    const trimmedVersion = version.trim();

    if (!trimmedName || !trimmedVersion) {
      continue;
    }

    dependencies.push({ name: trimmedName, installedVersion: trimmedVersion });
  }

  dependencies.sort((a, b) => a.name.localeCompare(b.name));

  return dependencies;
};

export interface PipEnvironmentInfo {
  pythonCommand: string;
  pythonPipInvoke: string;
  pythonVersion: string | null;
  projectLabel: string;
  dependencies: PipDependencyInput[];
  executable: ResolvedPythonExecutable;
}

export const listPipPackages = async (): Promise<PipEnvironmentInfo> => {
  const executable = await resolvePythonExecutable();
  const { command, versionArgs, version } = executable;
  const pythonCommand = formatPythonCommandLabel(command, versionArgs);

  const { stdout } = await execFileAsync(
    command,
    [...pipRunnerArgs(versionArgs), '-m', 'pip', 'list', '--format=json', '--exclude-editable'],
    { shell: false },
  );

  const dependencies = parsePipListJson(stdout);

  return {
    pythonCommand,
    pythonPipInvoke: formatPythonPipInvoke(command, versionArgs),
    pythonVersion: version,
    projectLabel: formatPythonProjectLabel(command, version),
    dependencies,
    executable,
  };
};
