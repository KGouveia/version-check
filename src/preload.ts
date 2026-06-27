import { contextBridge, ipcRenderer } from 'electron';
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

const SCAN_PROGRESS_CHANNEL = 'scan:progress';

contextBridge.exposeInMainWorld('versionTracker', {
  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => {
      callback(progress);
    };
    ipcRenderer.on(SCAN_PROGRESS_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(SCAN_PROGRESS_CHANNEL, listener);
    };
  },
  listSoftware: (): Promise<TrackedSoftware[]> => ipcRenderer.invoke('software:list'),
  addSoftware: (input: AddSoftwareInput): Promise<TrackedSoftware[]> =>
    ipcRenderer.invoke('software:add', input),
  deleteSoftware: (id: string): Promise<TrackedSoftware[]> =>
    ipcRenderer.invoke('software:delete', id),
  rescanAll: (): Promise<TrackedSoftware[]> =>
    ipcRenderer.invoke('software:rescan-all'),
  openDownload: (url: string): Promise<void> =>
    ipcRenderer.invoke('software:open-download', url),
  openDependencyAnalyzer: (): Promise<void> =>
    ipcRenderer.invoke('deps:open-analyzer'),
  getDependencyReport: (): Promise<DependencyAnalysisReport> =>
    ipcRenderer.invoke('deps:get-report'),
  rescanDependencies: (report: DependencyAnalysisReport): Promise<DependencyAnalysisReport> =>
    ipcRenderer.invoke('deps:rescan', report),
  changePackageJson: (): Promise<DependencyAnalysisReport> =>
    ipcRenderer.invoke('deps:change-package-json'),
  openNpmPackage: (packageName: string): Promise<void> =>
    ipcRenderer.invoke('deps:open-npm-package', packageName),
  exportDependencyReport: (report: DependencyAnalysisReport): Promise<{ filePath: string }> =>
    ipcRenderer.invoke('deps:export-report', report),
  openMavenDependencyAnalyzer: (): Promise<void> =>
    ipcRenderer.invoke('maven-deps:open-analyzer'),
  getMavenDependencyReport: (): Promise<MavenDependencyAnalysisReport> =>
    ipcRenderer.invoke('maven-deps:get-report'),
  rescanMavenDependencies: (
    report: MavenDependencyAnalysisReport,
  ): Promise<MavenDependencyAnalysisReport> =>
    ipcRenderer.invoke('maven-deps:rescan', report),
  changePomXml: (): Promise<MavenDependencyAnalysisReport> =>
    ipcRenderer.invoke('maven-deps:change-pom'),
  openMavenArtifact: (groupId: string, artifactId: string): Promise<void> =>
    ipcRenderer.invoke('maven-deps:open-artifact', groupId, artifactId),
  exportMavenDependencyReport: (
    report: MavenDependencyAnalysisReport,
  ): Promise<{ filePath: string }> =>
    ipcRenderer.invoke('maven-deps:export-report', report),
  openPipDependencyAnalyzer: (): Promise<void> =>
    ipcRenderer.invoke('pip-deps:open-analyzer'),
  getPipDependencyReport: (): Promise<PipDependencyAnalysisReport> =>
    ipcRenderer.invoke('pip-deps:get-report'),
  rescanPipDependencies: (
    report: PipDependencyAnalysisReport,
  ): Promise<PipDependencyAnalysisReport> => ipcRenderer.invoke('pip-deps:rescan', report),
  exportPipDependencyReport: (
    report: PipDependencyAnalysisReport,
  ): Promise<{ filePath: string }> => ipcRenderer.invoke('pip-deps:export-report', report),
  scanGlobalNpmModules: (): Promise<GlobalNpmModulesReport> =>
    ipcRenderer.invoke('global-npm:scan'),
  upgradeGlobalNpmModule: (packageName: string): Promise<GlobalNpmModulesReport> =>
    ipcRenderer.invoke('global-npm:upgrade', packageName),
  uninstallGlobalNpmModule: (packageName: string): Promise<GlobalNpmModulesReport> =>
    ipcRenderer.invoke('global-npm:uninstall', packageName),
  scanGlobalPipModules: (): Promise<GlobalPipModulesReport> =>
    ipcRenderer.invoke('global-pip:scan'),
  upgradeGlobalPipModule: (
    packageName: string,
    target: GlobalPipUpgradeTarget,
  ): Promise<GlobalPipModulesReport> =>
    ipcRenderer.invoke('global-pip:upgrade', packageName, target),
  uninstallGlobalPipModule: (packageName: string): Promise<GlobalPipModulesReport> =>
    ipcRenderer.invoke('global-pip:uninstall', packageName),
  openPipPackage: (packageName: string): Promise<void> =>
    ipcRenderer.invoke('global-pip:open-package', packageName),
});
