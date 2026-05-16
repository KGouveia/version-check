import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DependencySection, PackageDependencyInput } from '../types';

const NON_REGISTRY_PREFIXES = [
  'file:',
  'link:',
  'workspace:',
  'git:',
  'git+',
  'github:',
  'bitbucket:',
  'gitlab:',
  'gist:',
  'http:',
  'https:',
  'npm:',
  'patch:',
  'portal:',
  'catalog:',
];

export const isNpmRegistrySpec = (spec: string): boolean => {
  const trimmed = spec.trim();

  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (NON_REGISTRY_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return false;
  }

  return true;
};

export const inferCompareVersion = (declared: string): string | null => {
  const trimmed = declared.trim();

  if (!trimmed || trimmed === '*' || trimmed.toLowerCase() === 'latest') {
    return null;
  }

  const match = trimmed.match(/(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return null;
  }

  return `${match[1]}.${match[2]}.${match[3]}`;
};

const collectSection = (
  section: DependencySection,
  record: Record<string, string> | undefined,
): PackageDependencyInput[] => {
  if (!record || typeof record !== 'object') {
    return [];
  }

  const entries: PackageDependencyInput[] = [];

  for (const [name, declaredVersion] of Object.entries(record)) {
    if (typeof declaredVersion !== 'string' || !isNpmRegistrySpec(declaredVersion)) {
      continue;
    }

    entries.push({
      name,
      declaredVersion,
      section,
    });
  }

  return entries;
};

interface PackageJsonShape {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export const parsePackageJsonDependencies = async (
  packageJsonPath: string,
): Promise<{ projectLabel: string; dependencies: PackageDependencyInput[] }> => {
  const raw = await readFile(packageJsonPath, 'utf8');
  let parsed: PackageJsonShape;

  try {
    parsed = JSON.parse(raw) as PackageJsonShape;
  } catch {
    throw new Error('package.json is not valid JSON.');
  }

  const dependencies = [
    ...collectSection('dependencies', parsed.dependencies),
    ...collectSection('devDependencies', parsed.devDependencies),
  ];

  const dirName = path.basename(path.dirname(packageJsonPath));
  const projectLabel =
    typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name.trim()
      : dirName;

  return { projectLabel, dependencies };
};
