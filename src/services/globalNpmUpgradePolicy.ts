import type { GlobalNpmModule } from '../types';
import { compareVersions } from './semver';

const isSafeNpmVersionSpec = (spec: string): boolean =>
  spec === 'latest' || /^\d+\.\d+\.\d+$/.test(spec);

export const canUpgradeGlobalNpmModule = (module: GlobalNpmModule): boolean => {
  if (module.error || !module.compareVersion) {
    return false;
  }

  if (module.status === 'outdated-major' || module.status === 'outdated-minor') {
    return true;
  }

  if (
    module.latestSameReleaseLineVersion &&
    compareVersions(module.compareVersion, module.latestSameReleaseLineVersion) < 0
  ) {
    return true;
  }

  return false;
};

/** npm install target: `latest` or an exact x.y.z when only the same release line is behind. */
export const resolveGlobalNpmUpgradeSpec = (module: GlobalNpmModule): string => {
  if (module.status === 'outdated-major' || module.status === 'outdated-minor') {
    return 'latest';
  }

  if (module.latestSameReleaseLineVersion) {
    return module.latestSameReleaseLineVersion;
  }

  return 'latest';
};

export const assertSafeGlobalNpmUpgradeSpec = (spec: string): void => {
  if (!isSafeNpmVersionSpec(spec)) {
    throw new Error('Invalid npm version spec for upgrade.');
  }
};
