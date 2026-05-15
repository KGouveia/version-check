export const normalizeVersion = (version: string) => version.trim().replace(/^v/i, '');

const stripBuildMetadata = (version: string) => {
  const withoutPrerelease = normalizeVersion(version).split('-')[0];
  return withoutPrerelease.split('+')[0];
};

export const parseVersionParts = (version: string): [number, number, number] => {
  const core = stripBuildMetadata(version);
  const [major = '0', minor = '0', patch = '0'] = core.split('.');

  return [
    Number.parseInt(major, 10) || 0,
    Number.parseInt(minor, 10) || 0,
    Number.parseInt(patch, 10) || 0,
  ];
};

export const compareVersions = (left: string, right: string): number => {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }

    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
};

export type BehindTierStatus = 'up-to-date' | 'outdated-major' | 'outdated-minor';

export const resolveBehindTier = (current: string, latest: string): BehindTierStatus => {
  if (compareVersions(current, latest) >= 0) {
    return 'up-to-date';
  }

  const [currentMajor] = parseVersionParts(current);
  const [latestMajor] = parseVersionParts(latest);

  return currentMajor < latestMajor ? 'outdated-major' : 'outdated-minor';
};
