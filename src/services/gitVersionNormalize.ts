import { compareVersions, normalizeVersion, parseVersionParts } from './semver';

const GIT_FOR_WINDOWS_VERSION_PATTERN =
  /^v?(\d+\.\d+\.\d+)(?:\.windows\.(\d+))?$/i;

export const parseGitForWindowsVersion = (input: string): string | null => {
  const trimmed = input.trim();
  const fromCli = trimmed.match(/git version\s+(\d+\.\d+\.\d+(?:\.windows\.\d+)?)/i);
  const candidate = fromCli?.[1] ?? trimmed.replace(/^v/i, '');
  const match = candidate.match(GIT_FOR_WINDOWS_VERSION_PATTERN);

  if (!match) {
    return null;
  }

  const core = match[1];
  const windowsBuild = match[2];

  return windowsBuild ? `${core}.windows.${windowsBuild}` : core;
};

const gitVersionCore = (version: string): string => {
  const parsed = parseGitForWindowsVersion(version);

  if (!parsed) {
    return normalizeVersion(version).split('-')[0]?.split('+')[0] ?? '';
  }

  return parsed.split('.windows.')[0] ?? parsed;
};

const gitWindowsBuild = (version: string): number => {
  const parsed = parseGitForWindowsVersion(version);

  if (!parsed) {
    return 0;
  }

  const match = parsed.match(/\.windows\.(\d+)$/i);

  return match ? Number.parseInt(match[1], 10) || 0 : 0;
};

export const compareGitForWindowsVersions = (left: string, right: string): number => {
  const leftCore = gitVersionCore(left);
  const rightCore = gitVersionCore(right);
  const coreCompare = compareVersions(leftCore, rightCore);

  if (coreCompare !== 0) {
    return coreCompare;
  }

  return gitWindowsBuild(left) - gitWindowsBuild(right);
};

export const gitSameReleaseLinePrefix = (current: string): string | null => {
  const core = gitVersionCore(current);
  const match = core.match(/^(\d+\.\d+)\./);

  return match?.[1] ? `${match[1]}.` : null;
};

export const parseGitVersionPartsForTier = (
  version: string,
): [number, number, number] => {
  const core = gitVersionCore(version);

  return parseVersionParts(core);
};
