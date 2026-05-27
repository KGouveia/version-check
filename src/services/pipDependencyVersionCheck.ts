import crypto from 'node:crypto';
import type {
  AnalyzedPipDependency,
  PipDependencyAnalysisReport,
  PipDependencyInput,
} from '../types';
import { fetchPipIndexVersionInfo } from './pipIndexVersions';
import { listPipPackages } from './pipList';
import { mapWithConcurrency, type ScanProgressCallback } from './mapWithConcurrency';
import { inferPipCompareVersion, pypiPackagePageUrl } from './pypiRegistry';
import { resolvePythonExecutable, type ResolvedPythonExecutable } from './pythonExecutable';
import { resolveBehindTierForKind } from './versionKindTiers';

const REGISTRY_CONCURRENCY = 8;

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
  onProgress?: ScanProgressCallback,
): Promise<PipDependencyAnalysisReport> => {
  const resolved = executable ?? (await resolvePythonExecutable());
  const dependencies = await mapWithConcurrency(
    inputs,
    REGISTRY_CONCURRENCY,
    (input) => analyzeOne(input, resolved),
    onProgress,
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

export const analyzePipEnvironment = async (
  onProgress?: ScanProgressCallback,
): Promise<PipDependencyAnalysisReport> => {
  const env = await listPipPackages();
  return analyzePipDependencies(
    env.pythonCommand,
    env.pythonPipInvoke,
    env.pythonVersion,
    env.projectLabel,
    env.dependencies,
    env.executable,
    onProgress,
  );
};

export const rescanPipDependencies = async (
  report: PipDependencyAnalysisReport,
  onProgress?: ScanProgressCallback,
): Promise<PipDependencyAnalysisReport> => {
  void report;
  return analyzePipEnvironment(onProgress);
};
