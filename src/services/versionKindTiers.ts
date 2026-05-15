import type { SoftwareKind } from '../types';
import type { BehindTierStatus } from './semver';
import { compareVersions, parseVersionParts, resolveBehindTier } from './semver';
import { normalizeJavaForCompare } from './javaVersionNormalize';

export const resolveBehindTierForKind = (
  kind: SoftwareKind,
  current: string,
  latest: string,
): BehindTierStatus => {
  const comparableCurrent = kind === 'java' ? normalizeJavaForCompare(current) : current;
  const comparableLatest = kind === 'java' ? normalizeJavaForCompare(latest) : latest;

  if (compareVersions(comparableCurrent, comparableLatest) >= 0) {
    return 'up-to-date';
  }

  if (kind === 'python') {
    const [c0, c1] = parseVersionParts(comparableCurrent);
    const [l0, l1] = parseVersionParts(comparableLatest);

    if (c0 < l0 || (c0 === l0 && c1 < l1)) {
      return 'outdated-major';
    }

    return 'outdated-minor';
  }

  return resolveBehindTier(comparableCurrent, comparableLatest);
};
