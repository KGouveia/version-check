import type { AddSoftwareInput, DependencyAnalysisReport, TrackedSoftware } from './types';

declare global {
  interface Window {
    versionTracker: {
      listSoftware: () => Promise<TrackedSoftware[]>;
      addSoftware: (input: AddSoftwareInput) => Promise<TrackedSoftware[]>;
      deleteSoftware: (id: string) => Promise<TrackedSoftware[]>;
      rescanAll: () => Promise<TrackedSoftware[]>;
      openDownload: (url: string) => Promise<void>;
      openDependencyAnalyzer: () => Promise<void>;
      getDependencyReport: () => Promise<DependencyAnalysisReport>;
      rescanDependencies: (report: DependencyAnalysisReport) => Promise<DependencyAnalysisReport>;
      changePackageJson: () => Promise<DependencyAnalysisReport>;
      openNpmPackage: (packageName: string) => Promise<void>;
      exportDependencyReport: (
        report: DependencyAnalysisReport,
      ) => Promise<{ filePath: string }>;
    };
  }
}

export {};
