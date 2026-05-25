import { contextBridge, ipcRenderer } from 'electron';
import type {
  AddSoftwareInput,
  DependencyAnalysisReport,
  GlobalNpmModulesReport,
  MavenDependencyAnalysisReport,
  PipDependencyAnalysisReport,
  TrackedSoftware,
} from './types';

contextBridge.exposeInMainWorld('versionTracker', {
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
});
