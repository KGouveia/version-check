import type { GlobalPipModule, GlobalPipModulesReport } from '../types';
import { analyzePipDependencyInputs } from './pipDependencyVersionCheck';
import { listPipPackages } from './pipList';
import { collectTransitivePipDependencies } from './pipShow';
import type { ScanProgressCallback } from './mapWithConcurrency';
import { normalizePypiPackageName } from './pypiRegistry';

const buildInstalledNameMap = (
  dependencies: Array<{ name: string }>,
): Map<string, string> => {
  const map = new Map<string, string>();

  for (const dependency of dependencies) {
    map.set(normalizePypiPackageName(dependency.name), dependency.name);
  }

  return map;
};

const buildPreviousByName = (modules: GlobalPipModule[]): Map<string, GlobalPipModule> => {
  const map = new Map<string, GlobalPipModule>();

  for (const module of modules) {
    map.set(normalizePypiPackageName(module.name), module);
  }

  return map;
};

const computeRescanNamesAfterUninstall = (
  previousReport: GlobalPipModulesReport,
  installedInputs: Array<{ name: string; installedVersion: string }>,
): Set<string> => {
  const rescanNames = new Set<string>();
  const previousByName = buildPreviousByName(previousReport.modules);

  for (const input of installedInputs) {
    const previous = previousByName.get(normalizePypiPackageName(input.name));

    if (!previous || previous.installedVersion !== input.installedVersion) {
      rescanNames.add(input.name);
    }
  }

  return rescanNames;
};

const computeRescanNamesAfterUpgrade = async (
  previousReport: GlobalPipModulesReport,
  upgradedPackageName: string,
  installedByName: Map<string, string>,
  installedInputs: Array<{ name: string; installedVersion: string }>,
  executable: Awaited<ReturnType<typeof listPipPackages>>['executable'],
): Promise<Set<string>> => {
  const rescanNames = await collectTransitivePipDependencies(
    upgradedPackageName,
    installedByName,
    executable,
  );

  const previousByName = buildPreviousByName(previousReport.modules);

  for (const input of installedInputs) {
    const previous = previousByName.get(normalizePypiPackageName(input.name));

    if (!previous) {
      rescanNames.add(input.name);
      continue;
    }

    if (previous.installedVersion !== input.installedVersion) {
      rescanNames.add(input.name);
    }
  }

  return rescanNames;
};

const refreshGlobalPipModulesPartial = async (
  previousReport: GlobalPipModulesReport,
  env: Awaited<ReturnType<typeof listPipPackages>>,
  rescanNames: Set<string>,
  onProgress?: ScanProgressCallback,
): Promise<GlobalPipModulesReport> => {
  const rescanInputs = env.dependencies.filter((dependency) =>
    rescanNames.has(dependency.name),
  );

  const { dependencies: freshModules, vulnerabilityCheckError } =
    await analyzePipDependencyInputs(rescanInputs, env.executable, onProgress);

  const freshByName = new Map<string, GlobalPipModule>();

  for (const module of freshModules) {
    freshByName.set(normalizePypiPackageName(module.name), module);
  }

  const previousByName = buildPreviousByName(previousReport.modules);

  const modules = env.dependencies.map((input) => {
    const normalized = normalizePypiPackageName(input.name);
    const fresh = freshByName.get(normalized);

    if (fresh) {
      return fresh;
    }

    const previous = previousByName.get(normalized);

    if (previous && previous.installedVersion === input.installedVersion) {
      return previous;
    }

    throw new Error(`Missing refreshed analysis for ${input.name}.`);
  });

  return {
    modules,
    scannedAt: new Date().toISOString(),
    listError: null,
    pythonPipInvoke: env.pythonPipInvoke,
    pythonVersion: env.pythonVersion,
    vulnerabilityCheckError,
  };
};

export const refreshGlobalPipModulesAfterUpgrade = async (
  previousReport: GlobalPipModulesReport,
  upgradedPackageName: string,
  onProgress?: ScanProgressCallback,
): Promise<GlobalPipModulesReport> => {
  const env = await listPipPackages();
  const installedByName = buildInstalledNameMap(env.dependencies);

  const rescanNames = await computeRescanNamesAfterUpgrade(
    previousReport,
    upgradedPackageName,
    installedByName,
    env.dependencies,
    env.executable,
  );

  return refreshGlobalPipModulesPartial(previousReport, env, rescanNames, onProgress);
};

export const refreshGlobalPipModulesAfterUninstall = async (
  previousReport: GlobalPipModulesReport,
  onProgress?: ScanProgressCallback,
): Promise<GlobalPipModulesReport> => {
  const env = await listPipPackages();
  const rescanNames = computeRescanNamesAfterUninstall(previousReport, env.dependencies);

  return refreshGlobalPipModulesPartial(previousReport, env, rescanNames, onProgress);
};

export const scanGlobalPipModules = async (
  onProgress?: ScanProgressCallback,
): Promise<GlobalPipModulesReport> => {
  try {
    const env = await listPipPackages();
    const { dependencies, vulnerabilityCheckError } = await analyzePipDependencyInputs(
      env.dependencies,
      env.executable,
      onProgress,
    );

    return {
      modules: dependencies,
      scannedAt: new Date().toISOString(),
      listError: null,
      pythonPipInvoke: env.pythonPipInvoke,
      pythonVersion: env.pythonVersion,
      vulnerabilityCheckError,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to list pip packages in this environment.';

    return {
      modules: [],
      scannedAt: new Date().toISOString(),
      listError: message,
      pythonPipInvoke: '',
      pythonVersion: null,
    };
  }
};
