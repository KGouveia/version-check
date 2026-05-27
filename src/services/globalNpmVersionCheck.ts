import crypto from 'node:crypto';
import type { GlobalNpmModule, GlobalNpmModulesReport } from '../types';
import { mapWithConcurrency, type ScanProgressCallback } from './mapWithConcurrency';
import { fetchNpmVersionInfo, npmPackagePageUrl } from './npmRegistry';
import { listGlobalNpmPackages, type GlobalNpmListEntry } from './npmGlobalList';
import { normalizeVersion } from './semver';
import { resolveBehindTierForKind } from './versionKindTiers';

const REGISTRY_CONCURRENCY = 8;

export const inferGlobalNpmCompareVersion = (installedVersion: string): string | null => {
  const normalized = normalizeVersion(installedVersion);
  const match = normalized.match(/^(\d+\.\d+\.\d+)/);

  return match?.[1] ?? null;
};

const analyzeOne = async (input: GlobalNpmListEntry): Promise<GlobalNpmModule> => {
  const compareVersion = inferGlobalNpmCompareVersion(input.installedVersion);
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

  let status: GlobalNpmModule['status'] = 'unknown';

  if (error) {
    status = 'error';
  } else if (compareVersion && latestVersion) {
    status = resolveBehindTierForKind('nodejs', compareVersion, latestVersion);
  }

  return {
    id: crypto.randomUUID(),
    name: input.name,
    installedVersion: input.installedVersion,
    compareVersion,
    latestVersion,
    latestSameReleaseLineVersion,
    status,
    downloadUrl: npmPackagePageUrl(input.name),
    lastCheckedAt: checkedAt,
    error,
  };
};

export const scanGlobalNpmModules = async (
  onProgress?: ScanProgressCallback,
): Promise<GlobalNpmModulesReport> => {
  const { packages, listError } = await listGlobalNpmPackages();

  if (listError) {
    return {
      modules: [],
      scannedAt: new Date().toISOString(),
      listError,
    };
  }

  const modules = await mapWithConcurrency(
    packages,
    REGISTRY_CONCURRENCY,
    analyzeOne,
    onProgress,
  );

  return {
    modules,
    scannedAt: new Date().toISOString(),
    listError: null,
  };
};
