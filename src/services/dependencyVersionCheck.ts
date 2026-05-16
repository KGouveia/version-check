import crypto from 'node:crypto';
import type {
  AnalyzedDependency,
  DependencyAnalysisReport,
  PackageDependencyInput,
} from '../types';
import { fetchNpmVersionInfo, npmPackagePageUrl } from './npmRegistry';
import { inferCompareVersion } from './packageJsonAnalyzer';
import { resolveBehindTierForKind } from './versionKindTiers';

const REGISTRY_CONCURRENCY = 8;

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
};

const analyzeOne = async (input: PackageDependencyInput): Promise<AnalyzedDependency> => {
  const compareVersion = inferCompareVersion(input.declaredVersion);
  const checkedAt = new Date().toISOString();
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;
  let error: string | null = null;

  try {
    const info = await fetchNpmVersionInfo(input.name, compareVersion);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registry lookup failed.';
    error = message;
  }

  let status: AnalyzedDependency['status'] = 'unknown';

  if (error) {
    status = 'error';
  } else if (compareVersion && latestVersion) {
    status = resolveBehindTierForKind('codex-cli', compareVersion, latestVersion);
  }

  return {
    id: crypto.randomUUID(),
    name: input.name,
    section: input.section,
    declaredVersion: input.declaredVersion,
    compareVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: npmPackagePageUrl(input.name),
    lastCheckedAt: checkedAt,
    error,
  };
};

export const analyzeDependencies = async (
  packageJsonPath: string,
  projectLabel: string,
  inputs: PackageDependencyInput[],
): Promise<DependencyAnalysisReport> => {
  const dependencies = await mapWithConcurrency(inputs, REGISTRY_CONCURRENCY, analyzeOne);

  return {
    packageJsonPath,
    projectLabel,
    dependencies,
    analyzedAt: new Date().toISOString(),
  };
};

export const rescanDependencies = async (
  report: DependencyAnalysisReport,
): Promise<DependencyAnalysisReport> => {
  const inputs: PackageDependencyInput[] = report.dependencies.map((dep) => ({
    name: dep.name,
    declaredVersion: dep.declaredVersion,
    section: dep.section,
  }));

  return analyzeDependencies(report.packageJsonPath, report.projectLabel, inputs);
};
