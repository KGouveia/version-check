import { XMLParser } from 'fast-xml-parser';
import { compareVersions, normalizeVersion } from './semver';
import { isStableSemverKey } from './npmRegistry';

const metadataParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (tagName) => tagName === 'version',
});

export const mavenMetadataUrl = (groupId: string, artifactId: string): string => {
  const groupPath = groupId.replace(/\./g, '/');
  return `https://repo1.maven.org/maven2/${groupPath}/${artifactId}/maven-metadata.xml`;
};

export const mavenArtifactPageUrl = (groupId: string, artifactId: string): string =>
  `https://central.sonatype.com/artifact/${encodeURIComponent(groupId)}/${encodeURIComponent(artifactId)}`;

const sameReleaseLinePrefix = (current: string): string | null => {
  const core = normalizeVersion(current).split('-')[0]?.split('+')[0] ?? '';
  const match = core.match(/^(\d+\.\d+)\./);

  return match?.[1] ? `${match[1]}.` : null;
};

const latestOnSameReleaseLine = (current: string, versionKeys: string[]): string | null => {
  const prefix = sameReleaseLinePrefix(current);

  if (!prefix) {
    return null;
  }

  let best: string | null = null;

  for (const key of versionKeys) {
    if (!isStableSemverKey(key)) {
      continue;
    }

    const core = normalizeVersion(key).split('-')[0]?.split('+')[0] ?? '';

    if (!core.startsWith(prefix)) {
      continue;
    }

    if (!best || compareVersions(key, best) > 0) {
      best = key;
    }
  }

  return best;
};

const highestStableVersion = (versionKeys: string[]): string | null => {
  let best: string | null = null;

  for (const key of versionKeys) {
    if (!isStableSemverKey(key)) {
      continue;
    }

    if (!best || compareVersions(key, best) > 0) {
      best = key;
    }
  }

  return best;
};

const parseVersionsFromMetadata = (xml: string): string[] => {
  const parsed = metadataParser.parse(xml) as {
    metadata?: { versioning?: { versions?: { version?: unknown } } };
  };

  const versionNode = parsed.metadata?.versioning?.versions?.version;

  if (!versionNode) {
    return [];
  }

  const list = Array.isArray(versionNode) ? versionNode : [versionNode];

  return list
    .map((v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : null))
    .filter((v): v is string => Boolean(v));
};

export const fetchMavenCentralVersionInfo = async (
  groupId: string,
  artifactId: string,
  compareVersion: string | null,
): Promise<{ latestVersion: string; latestSameReleaseLineVersion: string | null }> => {
  const url = mavenMetadataUrl(groupId, artifactId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Maven Central returned HTTP ${response.status}.`);
  }

  const xml = await response.text();
  const versionKeys = parseVersionsFromMetadata(xml);
  const latestVersion = highestStableVersion(versionKeys);

  if (!latestVersion) {
    throw new Error('Maven Central metadata did not include a stable release.');
  }

  const latestSameReleaseLineVersion = compareVersion
    ? latestOnSameReleaseLine(compareVersion, versionKeys)
    : null;

  return { latestVersion, latestSameReleaseLineVersion };
};
