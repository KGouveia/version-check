import crypto from 'node:crypto';
import type {
  AnalyzedMavenDependency,
  MavenDependencyAnalysisReport,
  MavenDependencyInput,
} from '../types';
import { fetchMavenCentralVersionInfo, mavenArtifactPageUrl } from './mavenCentral';
import { mapWithConcurrency, type ScanProgressCallback } from './mapWithConcurrency';
import { inferMavenCompareVersion } from './pomXmlAnalyzer';
import { resolveBehindTierForKind } from './versionKindTiers';

const REGISTRY_CONCURRENCY = 8;

const analyzeOne = async (input: MavenDependencyInput): Promise<AnalyzedMavenDependency> => {
  const compareVersion = inferMavenCompareVersion(input.declaredVersion);
  const checkedAt = new Date().toISOString();
  let latestVersion: string | null = null;
  let latestSameReleaseLineVersion: string | null = null;
  let error: string | null = null;

  try {
    const info = await fetchMavenCentralVersionInfo(
      input.groupId,
      input.artifactId,
      compareVersion,
    );
    latestVersion = info.latestVersion;
    latestSameReleaseLineVersion = info.latestSameReleaseLineVersion;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registry lookup failed.';
    error = message;
  }

  let status: AnalyzedMavenDependency['status'] = 'unknown';

  if (error) {
    status = 'error';
  } else if (compareVersion && latestVersion) {
    status = resolveBehindTierForKind('maven', compareVersion, latestVersion);
  }

  return {
    id: crypto.randomUUID(),
    groupId: input.groupId,
    artifactId: input.artifactId,
    scope: input.scope,
    declaredVersion: input.declaredVersion,
    compareVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: mavenArtifactPageUrl(input.groupId, input.artifactId),
    lastCheckedAt: checkedAt,
    error,
  };
};

export const analyzeMavenDependencies = async (
  pomXmlPath: string,
  projectLabel: string,
  inputs: MavenDependencyInput[],
  onProgress?: ScanProgressCallback,
): Promise<MavenDependencyAnalysisReport> => {
  const dependencies = await mapWithConcurrency(
    inputs,
    REGISTRY_CONCURRENCY,
    analyzeOne,
    onProgress,
  );

  return {
    pomXmlPath,
    projectLabel,
    dependencies,
    analyzedAt: new Date().toISOString(),
  };
};

export const rescanMavenDependencies = async (
  report: MavenDependencyAnalysisReport,
  onProgress?: ScanProgressCallback,
): Promise<MavenDependencyAnalysisReport> => {
  const inputs: MavenDependencyInput[] = report.dependencies.map((dep) => ({
    groupId: dep.groupId,
    artifactId: dep.artifactId,
    declaredVersion: dep.declaredVersion,
    scope: dep.scope,
  }));

  return analyzeMavenDependencies(report.pomXmlPath, report.projectLabel, inputs, onProgress);
};
