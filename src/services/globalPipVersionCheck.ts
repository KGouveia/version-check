import type { GlobalPipModulesReport } from '../types';
import { analyzePipDependencies } from './pipDependencyVersionCheck';
import { listPipPackages } from './pipList';
import type { ScanProgressCallback } from './mapWithConcurrency';

export const scanGlobalPipModules = async (
  onProgress?: ScanProgressCallback,
): Promise<GlobalPipModulesReport> => {
  try {
    const env = await listPipPackages();
    const report = await analyzePipDependencies(
      env.pythonCommand,
      env.pythonPipInvoke,
      env.pythonVersion,
      env.projectLabel,
      env.dependencies,
      env.executable,
      onProgress,
    );

    return {
      modules: report.dependencies,
      scannedAt: new Date().toISOString(),
      listError: null,
      pythonPipInvoke: report.pythonPipInvoke,
      pythonVersion: report.pythonVersion,
      vulnerabilityCheckError: report.vulnerabilityCheckError,
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
