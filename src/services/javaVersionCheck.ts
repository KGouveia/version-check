import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TrackedSoftware } from '../types';
import { resolveBehindTierForKind } from './versionKindTiers';

const execFileAsync = promisify(execFile);

const openJdkLandingUrl = 'https://openjdk.org/';
const openJdkDownloadBase = 'https://jdk.java.net/';
const openJdkCurrentReleaseApi = 'https://java.oraclecloud.com/currentJavaReleases';
const openJdkVersionsApi = 'https://java.oraclecloud.com/javaVersions';

interface CurrentJavaReleaseResponse {
  releaseVersion?: string;
  jdkDetails?: {
    latestReleaseVersion?: string;
  };
}

interface JavaVersionsResponse {
  items?: Array<{
    latestReleaseVersion?: string;
  }>;
}

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

const getLatestOpenJdkForMajor = async (major: number): Promise<string> => {
  const currentResponse = await fetch(`${openJdkCurrentReleaseApi}/${major}`);

  if (currentResponse.ok) {
    const data = (await currentResponse.json()) as CurrentJavaReleaseResponse;
    const version = data.releaseVersion ?? data.jdkDetails?.latestReleaseVersion;

    if (version) {
      return version;
    }
  }

  const versionsUrl = new URL(openJdkVersionsApi);
  versionsUrl.searchParams.set('jdkVersion', String(major));

  const versionsResponse = await fetch(versionsUrl);

  if (!versionsResponse.ok) {
    throw new Error(`OpenJDK release API returned HTTP ${versionsResponse.status}.`);
  }

  const versionsData = (await versionsResponse.json()) as JavaVersionsResponse;
  const latest = versionsData.items?.[0]?.latestReleaseVersion;

  if (!latest) {
    throw new Error(`No OpenJDK release found for Java ${major}.`);
  }

  return latest;
};

const buildDownloadUrl = (major: number) =>
  major > 0 ? `${openJdkDownloadBase}${major}/` : openJdkLandingUrl;

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
      latestVersion = await getLatestOpenJdkForMajor(major);
    } else {
      throw new Error('Missing Java major version.');
    }
  } catch {
    errors.push('Unable to fetch the latest OpenJDK release for this major version.');
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
    downloadUrl: buildDownloadUrl(major),
    lastCheckedAt: new Date().toISOString(),
    error: errors.length > 0 ? errors.join(' ') : null,
  };
};
