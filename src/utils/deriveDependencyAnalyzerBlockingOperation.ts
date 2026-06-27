import type { BlockingOperation, ScanProgress } from '../types';

export interface DependencyAnalyzerBlockingInput {
  isScanning: boolean;
  isChangingFile: boolean;
  isExporting: boolean;
  scanProgress: ScanProgress | null;
}

export const deriveDependencyAnalyzerBlockingOperation = (
  input: DependencyAnalyzerBlockingInput,
): BlockingOperation | null => {
  const { isScanning, isChangingFile, isExporting, scanProgress } = input;

  if (isChangingFile) {
    return {
      kind: 'open-analyzer',
      title: 'Loading package.json…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isScanning) {
    return {
      kind: 'scan',
      title: 'Scanning dependencies…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isExporting) {
    return {
      kind: 'export',
      title: 'Exporting analysis…',
    };
  }

  return null;
};

export interface MavenAnalyzerBlockingInput {
  isScanning: boolean;
  isChangingFile: boolean;
  isExporting: boolean;
  scanProgress: ScanProgress | null;
}

export const deriveMavenAnalyzerBlockingOperation = (
  input: MavenAnalyzerBlockingInput,
): BlockingOperation | null => {
  const { isScanning, isChangingFile, isExporting, scanProgress } = input;

  if (isChangingFile) {
    return {
      kind: 'open-analyzer',
      title: 'Loading pom.xml…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isScanning) {
    return {
      kind: 'scan',
      title: 'Scanning Maven dependencies…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isExporting) {
    return {
      kind: 'export',
      title: 'Exporting analysis…',
    };
  }

  return null;
};

export interface PipAnalyzerBlockingInput {
  isScanning: boolean;
  isExporting: boolean;
  scanProgress: ScanProgress | null;
}

export const derivePipAnalyzerBlockingOperation = (
  input: PipAnalyzerBlockingInput,
): BlockingOperation | null => {
  const { isScanning, isExporting, scanProgress } = input;

  if (isScanning) {
    return {
      kind: 'scan',
      title: 'Scanning pip packages…',
      progress: scanProgress,
      progressItemLabel: 'packages',
    };
  }

  if (isExporting) {
    return {
      kind: 'export',
      title: 'Exporting analysis…',
    };
  }

  return null;
};
