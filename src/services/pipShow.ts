import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isValidPypiPackageName } from '../constants/pypiPackageName';
import { normalizePypiPackageName } from './pypiRegistry';
import { pipRunnerArgs, type ResolvedPythonExecutable } from './pythonExecutable';

const execFileAsync = promisify(execFile);

const parseRequiresLine = (stdout: string): string[] => {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.startsWith('Requires:')) {
      continue;
    }

    const value = line.slice('Requires:'.length).trim();

    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && isValidPypiPackageName(part));
  }

  return [];
};

export const pipShowRequires = async (
  packageName: string,
  executable: ResolvedPythonExecutable,
): Promise<string[]> => {
  const trimmed = packageName.trim();

  if (!isValidPypiPackageName(trimmed)) {
    return [];
  }

  const { command, versionArgs } = executable;
  const pipArgs = [...pipRunnerArgs(versionArgs), '-m', 'pip', 'show', trimmed];

  try {
    const { stdout } = await execFileAsync(command, pipArgs, { shell: false });
    return parseRequiresLine(stdout);
  } catch {
    return [];
  }
};

export const collectTransitivePipDependencies = async (
  rootPackage: string,
  installedNames: ReadonlyMap<string, string>,
  executable: ResolvedPythonExecutable,
): Promise<Set<string>> => {
  const rootNormalized = normalizePypiPackageName(rootPackage);
  const rootCanonical = installedNames.get(rootNormalized);

  if (!rootCanonical) {
    return new Set();
  }

  const collected = new Set<string>([rootCanonical]);
  const visited = new Set<string>();
  const queue = [rootCanonical];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const requires = await pipShowRequires(current, executable);

    for (const dependency of requires) {
      const canonical = installedNames.get(normalizePypiPackageName(dependency));

      if (!canonical || collected.has(canonical)) {
        continue;
      }

      collected.add(canonical);
      queue.push(canonical);
    }
  }

  return collected;
};
