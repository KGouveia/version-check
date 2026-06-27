import { SOFTWARE_KIND_LABELS } from '../constants/softwareCatalog';
import type { BlockingOperation, ScanProgress, SoftwareKind } from '../types';

export interface MainWindowBlockingInput {
  upgradingNpmPackage: string | null;
  upgradingPipPackage: string | null;
  isScanningGlobalNpm: boolean;
  isScanningGlobalPip: boolean;
  isScanning: boolean;
  isOpeningDeps: boolean;
  isOpeningMavenDeps: boolean;
  isOpeningPipDeps: boolean;
  togglingKind: SoftwareKind | null;
  scanProgress: ScanProgress | null;
}

export const deriveMainWindowBlockingOperation = (
  input: MainWindowBlockingInput,
): BlockingOperation | null => {
  const {
    upgradingNpmPackage,
    upgradingPipPackage,
    isScanningGlobalNpm,
    isScanningGlobalPip,
    isScanning,
    isOpeningDeps,
    isOpeningMavenDeps,
    isOpeningPipDeps,
    togglingKind,
    scanProgress,
  } = input;

  if (upgradingNpmPackage) {
    if (scanProgress) {
      return {
        kind: 'upgrade',
        title: `Refreshing version checks for ${upgradingNpmPackage}…`,
        subtitle: 'Global npm module',
        progress: scanProgress,
        progressItemLabel: 'modules',
      };
    }

    return {
      kind: 'upgrade',
      title: `Installing ${upgradingNpmPackage}…`,
      subtitle: 'Running npm install -g',
    };
  }

  if (upgradingPipPackage) {
    if (scanProgress) {
      return {
        kind: 'upgrade',
        title: `Refreshing version checks for ${upgradingPipPackage}…`,
        subtitle: 'Pip package',
        progress: scanProgress,
        progressItemLabel: 'packages',
      };
    }

    return {
      kind: 'upgrade',
      title: `Installing ${upgradingPipPackage}…`,
      subtitle: 'Running pip install --upgrade',
    };
  }

  if (isScanningGlobalNpm) {
    return {
      kind: 'scan',
      title: 'Scanning global npm modules…',
      progress: scanProgress,
      progressItemLabel: 'modules',
    };
  }

  if (isScanningGlobalPip) {
    return {
      kind: 'scan',
      title: 'Scanning pip packages…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isScanning) {
    return {
      kind: 'rescan-all',
      title: 'Re-checking tracked software…',
    };
  }

  if (isOpeningDeps) {
    return {
      kind: 'open-analyzer',
      title: 'Analyzing package.json…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isOpeningMavenDeps) {
    return {
      kind: 'open-analyzer',
      title: 'Analyzing pom.xml…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isOpeningPipDeps) {
    return {
      kind: 'open-analyzer',
      title: 'Analyzing pip environment…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (togglingKind) {
    return {
      kind: 'toggle-software',
      title: 'Updating monitored software…',
      subtitle: SOFTWARE_KIND_LABELS[togglingKind],
    };
  }

  return null;
};
