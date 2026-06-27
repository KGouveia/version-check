import type {
  AddSoftwareInput,
  DependencyAnalysisReport,
  GlobalNpmModulesReport,
  GlobalPipModulesReport,
  GlobalPipUpgradeTarget,
  MavenDependencyAnalysisReport,
  PipDependencyAnalysisReport,
  ScanProgress,
  TrackedSoftware,
} from './types';

declare global {
  interface Window {
    versionTracker: {
      onScanProgress: (callback: (progress: ScanProgress) => void) => () => void;
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
      openMavenDependencyAnalyzer: () => Promise<void>;
      getMavenDependencyReport: () => Promise<MavenDependencyAnalysisReport>;
      rescanMavenDependencies: (
        report: MavenDependencyAnalysisReport,
      ) => Promise<MavenDependencyAnalysisReport>;
      changePomXml: () => Promise<MavenDependencyAnalysisReport>;
      openMavenArtifact: (groupId: string, artifactId: string) => Promise<void>;
      exportMavenDependencyReport: (
        report: MavenDependencyAnalysisReport,
      ) => Promise<{ filePath: string }>;
      openPipDependencyAnalyzer: () => Promise<void>;
      getPipDependencyReport: () => Promise<PipDependencyAnalysisReport>;
      rescanPipDependencies: (
        report: PipDependencyAnalysisReport,
      ) => Promise<PipDependencyAnalysisReport>;
      exportPipDependencyReport: (
        report: PipDependencyAnalysisReport,
      ) => Promise<{ filePath: string }>;
      scanGlobalNpmModules: () => Promise<GlobalNpmModulesReport>;
      upgradeGlobalNpmModule: (packageName: string) => Promise<GlobalNpmModulesReport>;
      uninstallGlobalNpmModule: (packageName: string) => Promise<GlobalNpmModulesReport>;
      scanGlobalPipModules: () => Promise<GlobalPipModulesReport>;
      upgradeGlobalPipModule: (
        packageName: string,
        target: GlobalPipUpgradeTarget,
      ) => Promise<GlobalPipModulesReport>;
      uninstallGlobalPipModule: (packageName: string) => Promise<GlobalPipModulesReport>;
      openPipPackage: (packageName: string) => Promise<void>;
    };
  }
}

export {};
