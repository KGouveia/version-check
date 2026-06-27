import { isValidNpmPackageName } from '../constants/npmPackageName';
import { runNpm } from './npmGlobalExec';

export const uninstallGlobalNpmPackage = async (packageName: string): Promise<void> => {
  const trimmed = packageName.trim();

  if (!isValidNpmPackageName(trimmed)) {
    throw new Error('Invalid npm package name.');
  }

  try {
    await runNpm(['uninstall', '-g', trimmed]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to uninstall the global npm package.';

    throw new Error(message, err instanceof Error ? { cause: err } : undefined);
  }
};
