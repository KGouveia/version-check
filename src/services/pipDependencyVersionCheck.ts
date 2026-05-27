import crypto from 'node:crypto';
import type {
  AnalyzedPipDependency,
  PipDependencyAnalysisReport,
  PipDependencyInput,
} from '../types';
import { fetchPipIndexVersionInfo } from './pipIndexVersions';
import { listPipPackages } from './pipList';
import { inferPipCompareVersion, pypiPackagePageUrl } from './pypiRegistry';
import { resolvePythonExecutable, type ResolvedPythonExecutable } from './pythonExecutable';
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

const analyzeOne = async (
  input: PipDependencyInput,
  executable: ResolvedPythonExecutable,
): Promise<AnalyzedPipDependency> => {
  const compareVersion = inferPipCompareVersion(input.installedVersion);
  const checkedAt = new Date().toISOString();
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;
  let error: string | null = null;

  try {
    const info = await fetchPipIndexVersionInfo(input.name, compareVersion, executable);
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Index lookup failed.';
    error = message;
  }

  let status: AnalyzedPipDependency['status'] = 'unknown';

  if (error) {
    status = 'error';
  } else if (compareVersion && latestVersion) {
    status = resolveBehindTierForKind('python', compareVersion, latestVersion);
  }

  return {
    id: crypto.randomUUID(),
    name: input.name,
    installedVersion: input.installedVersion,
    compareVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: pypiPackagePageUrl(input.name),
    lastCheckedAt: checkedAt,
    error,
  };
};

export const analyzePipDependencies = async (
  pythonCommand: string,
  pythonPipInvoke: string,
  pythonVersion: string | null,
  projectLabel: string,
  inputs: PipDependencyInput[],
  executable?: ResolvedPythonExecutable,
): Promise<PipDependencyAnalysisReport> => {
  const resolved = executable ?? (await resolvePythonExecutable());
  const dependencies = await mapWithConcurrency(inputs, REGISTRY_CONCURRENCY, (input) =>
    analyzeOne(input, resolved),
  );

  return {
    pythonCommand,
    pythonPipInvoke,
    pythonVersion,
    projectLabel,
    dependencies,
    analyzedAt: new Date().toISOString(),
  };
};

export const analyzePipEnvironment = async (): Promise<PipDependencyAnalysisReport> => {
  const env = await listPipPackages();
  return analyzePipDependencies(
    env.pythonCommand,
    env.pythonPipInvoke,
    env.pythonVersion,
    env.projectLabel,
    env.dependencies,
    env.executable,
  );
};

export const rescanPipDependencies = async (
  report: PipDependencyAnalysisReport,
): Promise<PipDependencyAnalysisReport> => {
  void report;
  return analyzePipEnvironment();
};
