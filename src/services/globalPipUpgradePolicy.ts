import type { GlobalPipModule } from '../types';
import { compareVersions } from './semver';

const isSafePipVersionSpec = (spec: string): boolean => /^\d+\.\d+\.\d+$/.test(spec);

export const canUpgradeGlobalPipModule = (module: GlobalPipModule): boolean => {
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

/** pip install target: exact x.y.z from latest or same release line. */
export const resolveGlobalPipUpgradeSpec = (module: GlobalPipModule): string => {
  if (module.status === 'outdated-major' || module.status === 'outdated-minor') {
    if (module.latestVersion && isSafePipVersionSpec(module.latestVersion)) {
      return module.latestVersion;
    }
  }

  if (
    module.latestSameReleaseLineVersion &&
    isSafePipVersionSpec(module.latestSameReleaseLineVersion)
  ) {
    return module.latestSameReleaseLineVersion;
  }

  if (module.latestVersion && isSafePipVersionSpec(module.latestVersion)) {
    return module.latestVersion;
  }

  throw new Error('No safe pip version spec for upgrade.');
};

export const assertSafeGlobalPipUpgradeSpec = (spec: string): void => {
  if (!isSafePipVersionSpec(spec)) {
    throw new Error('Invalid pip version spec for upgrade.');
  }
};
