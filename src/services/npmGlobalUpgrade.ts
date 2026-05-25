import { isValidNpmPackageName } from '../constants/npmPackageName';
import { assertSafeGlobalNpmUpgradeSpec } from './globalNpmUpgradePolicy';
import { runNpm } from './npmGlobalExec';

export const upgradeGlobalNpmPackage = async (
  packageName: string,
  versionSpec: string,
): Promise<void> => {
  const trimmed = packageName.trim();

  if (!isValidNpmPackageName(trimmed)) {
    throw new Error('Invalid npm package name.');
  }

  assertSafeGlobalNpmUpgradeSpec(versionSpec);

  try {
    await runNpm(['install', '-g', `${trimmed}@${versionSpec}`]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to upgrade the global npm package.';

    throw new Error(message, err instanceof Error ? { cause: err } : undefined);
  }
};
