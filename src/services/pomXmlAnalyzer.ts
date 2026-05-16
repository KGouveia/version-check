import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { MavenDependencyInput, MavenDependencyScope } from '../types';

const PROPERTY_PLACEHOLDER = /\$\{([^}]+)\}/g;
const MAX_PROPERTY_DEPTH = 8;

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (tagName) => tagName === 'dependency',
});

const textValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
};

export const resolveMavenProperties = (
  value: string,
  properties: Record<string, string>,
  depth = 0,
): string => {
  if (depth >= MAX_PROPERTY_DEPTH) {
    return value;
  }

  const resolved = value.replace(PROPERTY_PLACEHOLDER, (_match, key: string) => {
    const prop = properties[key.trim()];

    if (prop === undefined) {
      return _match;
    }

    return prop;
  });

  if (resolved.includes('${') && resolved !== value) {
    return resolveMavenProperties(resolved, properties, depth + 1);
  }

  if (resolved.includes('${')) {
    return resolved;
  }

  return resolved;
};

export const inferMavenCompareVersion = (declared: string): string | null => {
  const trimmed = declared.trim();

  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();

  if (upper === 'LATEST' || upper === 'RELEASE') {
    return null;
  }

  const match = trimmed.match(/(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return null;
  }

  return `${match[1]}.${match[2]}.${match[3]}`;
};

export interface RawMavenDependency {
  groupId: string | null;
  artifactId: string | null;
  version: string | null;
  scope: string | null;
  systemPath: string | null;
}

export const isMavenCentralResolvable = (dep: RawMavenDependency): boolean => {
  if (!dep.groupId || !dep.artifactId || !dep.version) {
    return false;
  }

  if (dep.version.includes('${')) {
    return false;
  }

  const scope = (dep.scope ?? 'compile').toLowerCase();

  if (scope === 'import') {
    return false;
  }

  if (scope === 'system' && dep.systemPath && !dep.version) {
    return false;
  }

  return true;
};

const parseProperties = (propertiesNode: unknown): Record<string, string> => {
  const props: Record<string, string> = {};

  if (!propertiesNode || typeof propertiesNode !== 'object') {
    return props;
  }

  for (const [key, value] of Object.entries(propertiesNode as Record<string, unknown>)) {
    const text = textValue(value);

    if (text) {
      props[key] = text;
    }
  }

  return props;
};

const normalizeDependencies = (dependenciesNode: unknown): RawMavenDependency[] => {
  if (!dependenciesNode || typeof dependenciesNode !== 'object') {
    return [];
  }

  const dependencyNode = (dependenciesNode as { dependency?: unknown }).dependency;

  if (!dependencyNode) {
    return [];
  }

  const list = Array.isArray(dependencyNode) ? dependencyNode : [dependencyNode];

  return list.map((item) => {
    if (!item || typeof item !== 'object') {
      return {
        groupId: null,
        artifactId: null,
        version: null,
        scope: null,
        systemPath: null,
      };
    }

    const dep = item as Record<string, unknown>;

    return {
      groupId: textValue(dep.groupId),
      artifactId: textValue(dep.artifactId),
      version: textValue(dep.version),
      scope: textValue(dep.scope),
      systemPath: textValue(dep.systemPath),
    };
  });
};

interface PomProjectShape {
  name?: unknown;
  artifactId?: unknown;
  properties?: unknown;
  dependencies?: unknown;
}

export const parsePomXmlDependencies = async (
  pomXmlPath: string,
): Promise<{ projectLabel: string; dependencies: MavenDependencyInput[] }> => {
  const raw = await readFile(pomXmlPath, 'utf8');
  let parsed: { project?: PomProjectShape };

  try {
    parsed = xmlParser.parse(raw) as { project?: PomProjectShape };
  } catch {
    throw new Error('pom.xml is not valid XML.');
  }

  const project = parsed.project;

  if (!project) {
    throw new Error('pom.xml does not contain a <project> element.');
  }

  const properties = parseProperties(project.properties);
  const rawDeps = normalizeDependencies(project.dependencies);
  const dependencies: MavenDependencyInput[] = [];

  for (const raw of rawDeps) {
    if (!raw.groupId || !raw.artifactId) {
      continue;
    }

    const resolvedGroupId = resolveMavenProperties(raw.groupId, properties);
    const resolvedArtifactId = resolveMavenProperties(raw.artifactId, properties);
    const resolvedVersion = raw.version
      ? resolveMavenProperties(raw.version, properties)
      : null;

    const resolved: RawMavenDependency = {
      groupId: resolvedGroupId,
      artifactId: resolvedArtifactId,
      version: resolvedVersion,
      scope: raw.scope,
      systemPath: raw.systemPath,
    };

    if (
      !isMavenCentralResolvable(resolved) ||
      !resolved.version ||
      !resolved.groupId ||
      !resolved.artifactId
    ) {
      continue;
    }

    const scope: MavenDependencyScope = (resolved.scope ?? 'compile').toLowerCase();

    dependencies.push({
      groupId: resolved.groupId,
      artifactId: resolved.artifactId,
      declaredVersion: resolved.version,
      scope,
    });
  }

  const dirName = path.basename(path.dirname(pomXmlPath));
  const name = textValue(project.name);
  const artifactId = textValue(project.artifactId);
  const projectLabel = name ?? artifactId ?? dirName;

  return { projectLabel, dependencies };
};
