import type { GlobalPipModule, GlobalPipUpgradeTarget } from '../types';
import { compareVersions } from './semver';

const isSafePipVersionSpec = (spec: string): boolean => /^\d+\.\d+\.\d+$/.test(spec);

const targetVersionFor = (
  module: GlobalPipModule,
  target: GlobalPipUpgradeTarget,
): string | null =>
  target === 'minor' ? module.latestSameReleaseLineVersion : module.latestVersion;

export const canUpgradeGlobalPipModuleTo = (
  module: GlobalPipModule,
  target: GlobalPipUpgradeTarget,
): boolean => {
  if (module.error || !module.compareVersion) {
    return false;
  }

  const version = targetVersionFor(module, target);
  if (!version || !isSafePipVersionSpec(version)) {
    return false;
  }

  return compareVersions(module.compareVersion, version) < 0;
};

export const canUpgradeGlobalPipModule = (module: GlobalPipModule): boolean =>
  canUpgradeGlobalPipModuleTo(module, 'minor') || canUpgradeGlobalPipModuleTo(module, 'major');

/** pip install target: exact x.y.z for minor (same release line) or major (latest). */
export const resolveGlobalPipUpgradeSpec = (
  module: GlobalPipModule,
  target: GlobalPipUpgradeTarget,
): string => {
  const version = targetVersionFor(module, target);

  if (!version || !isSafePipVersionSpec(version)) {
    throw new Error(`No safe pip version spec for ${target} upgrade.`);
  }

  if (!module.compareVersion || compareVersions(module.compareVersion, version) >= 0) {
    throw new Error(`No ${target} upgrade is available for this package.`);
  }

  return version;
};

export const assertSafeGlobalPipUpgradeSpec = (spec: string): void => {
  if (!isSafePipVersionSpec(spec)) {
    throw new Error('Invalid pip version spec for upgrade.');
  }
};
