import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { normalizeJavaForCompare } from './javaVersionNormalize';
import { compareVersions } from './semver';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);

const adoptiumVendor = 'eclipse';
const javaDownloadBase = 'https://adoptium.net/temurin/releases/';

const mapOs = (): string => {
  switch (process.platform) {
    case 'darwin':
      return 'mac';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
};

const mapArch = (): string => {
  switch (process.arch) {
    case 'x64':
      return 'x64';
    case 'arm64':
      return 'aarch64';
    default:
      return process.arch;
  }
};

const parseJavaVersionLine = (stderr: string): { display: string; major: number } => {
  const firstLine = stderr.split(/\r?\n/)[0] ?? '';
  const quoted = firstLine.match(/version\s+"([^"]+)"/i);

  if (!quoted?.[1]) {
    throw new Error('Unable to parse java -version output.');
  }

  const raw = quoted[1];
  let major: number;

  if (raw.startsWith('1.')) {
    const legacyMinor = raw.split(/[._]/)[1];
    major = Number.parseInt(legacyMinor ?? '8', 10) || 8;
  } else {
    major = Number.parseInt(raw.split(/[._]/)[0] ?? '0', 10) || 0;
  }

  return { display: raw, major: major === 0 ? 8 : major };
};

const getLocalJavaVersion = async (): Promise<{ display: string; major: number }> => {
  const result = await execFileAsync('java', ['-version'], { shell: false });
  const stderr = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim();

  return parseJavaVersionLine(stderr);
};

interface AdoptiumFeatureRelease {
  version_data?: {
    openjdk_version?: string;
    semver?: string;
  };
}

const getLatestTemurinForMajor = async (major: number): Promise<string> => {
  const os = mapOs();
  const arch = mapArch();
  const url = new URL(
    `https://api.adoptium.net/v3/assets/feature_releases/${major}/ga`,
  );
  url.searchParams.set('vendor', adoptiumVendor);
  url.searchParams.set('image_type', 'jdk');
  url.searchParams.set('architecture', arch);
  url.searchParams.set('heap_size', 'normal');
  url.searchParams.set('jvm_impl', 'hotspot');
  url.searchParams.set('os', os);
  url.searchParams.set('page_size', '50');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Adoptium API returned HTTP ${response.status}.`);
  }

  const releases = (await response.json()) as AdoptiumFeatureRelease[];
  let best: string | null = null;

  for (const release of releases) {
    const candidate =
      typeof release.version_data?.openjdk_version === 'string'
        ? release.version_data.openjdk_version
        : typeof release.version_data?.semver === 'string'
          ? release.version_data.semver
          : null;

    if (!candidate) {
      continue;
    }

    if (!best || compareVersions(normalizeJavaForCompare(candidate), normalizeJavaForCompare(best)) > 0) {
      best = candidate;
    }
  }

  if (!best) {
    throw new Error(`No Temurin GA release found for Java ${major}.`);
  }

  return best;
};

const buildDownloadUrl = (major: number) =>
  `${javaDownloadBase}?version=${major}`;

export const checkJavaVersion = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  const errors: string[] = [];
  let currentVersion: string | null = null;
  let latestVersion: string | null = null;
  let major = 0;

  try {
    const local = await getLocalJavaVersion();
    currentVersion = local.display;
    major = local.major;
  } catch {
    errors.push('Unable to run java -version.');
  }

  try {
    if (major > 0) {
      latestVersion = await getLatestTemurinForMajor(major);
    } else {
      throw new Error('Missing Java major version.');
    }
  } catch {
    errors.push('Unable to fetch the latest Eclipse Temurin release for this major version.');
  }

  const status =
    currentVersion && latestVersion
      ? resolveBehindTierForKind('java', currentVersion, latestVersion)
      : 'error';

  return {
    ...software,
    currentVersion,
    latestVersion,
    latestSameReleaseLineVersion: latestVersion,
    status,
    downloadUrl: major > 0 ? buildDownloadUrl(major) : `${javaDownloadBase}`,
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
