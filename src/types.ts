export type SoftwareKind = 'nodejs' | 'python' | 'java' | 'maven' | 'git';

export type VersionStatus =
  | 'unknown'
  | 'up-to-date'
  | 'outdated'
  | 'outdated-major'
  | 'outdated-minor'
  | 'error';

export interface TrackedSoftware {
  id: string;
  name: string;
  kind: SoftwareKind;
  currentVersion: string | null;
  latestVersion: string | null;
  /**
   * Latest stable release on the same semver major.minor line as local (e.g. max 3.13.z when local is 3.13.3).
   * Node: from index.json; Python: from python.org API; Java: same-major OpenJDK release as latestVersion; Maven: GitHub apache/maven releases; Git: Git for Windows GitHub releases.
   */
  latestSameReleaseLineVersion?: string | null;
  status: VersionStatus;
  downloadUrl: string;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface AddSoftwareInput {
  name: string;
  kind: SoftwareKind;
}

export type DependencySection = 'dependencies' | 'devDependencies';

export interface PackageDependencyInput {
  name: string;
  declaredVersion: string;
  section: DependencySection;
}

export interface AnalyzedDependency {
  id: string;
  name: string;
  section: DependencySection;
  declaredVersion: string;
  compareVersion: string | null;
  latestVersion: string | null;
  latestSameReleaseLineVersion: string | null;
  status: VersionStatus;
  downloadUrl: string;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface DependencyAnalysisReport {
  packageJsonPath: string;
  projectLabel: string;
  dependencies: AnalyzedDependency[];
  analyzedAt: string;
}

export type MavenDependencyScope =
  | 'compile'
  | 'test'
  | 'provided'
  | 'runtime'
  | 'system'
  | string;

export interface MavenDependencyInput {
  groupId: string;
  artifactId: string;
  declaredVersion: string;
  scope: MavenDependencyScope;
}

export interface AnalyzedMavenDependency {
  id: string;
  groupId: string;
  artifactId: string;
  scope: MavenDependencyScope;
  declaredVersion: string;
  compareVersion: string | null;
  latestVersion: string | null;
  latestSameReleaseLineVersion: string | null;
  status: VersionStatus;
  downloadUrl: string;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface MavenDependencyAnalysisReport {
  pomXmlPath: string;
  projectLabel: string;
  dependencies: AnalyzedMavenDependency[];
  analyzedAt: string;
}

export interface PipDependencyInput {
  name: string;
  installedVersion: string;
}

export interface AnalyzedPipDependency {
  id: string;
  name: string;
  installedVersion: string;
  compareVersion: string | null;
  latestVersion: string | null;
  latestSameReleaseLineVersion: string | null;
  status: VersionStatus;
  downloadUrl: string;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface PipDependencyAnalysisReport {
  pythonCommand: string;
  pythonPipInvoke: string;
  pythonVersion: string | null;
  projectLabel: string;
  dependencies: AnalyzedPipDependency[];
  analyzedAt: string;
}

export interface GlobalNpmModule {
  id: string;
  name: string;
  installedVersion: string;
  compareVersion: string | null;
  latestVersion: string | null;
  latestSameReleaseLineVersion: string | null;
  status: VersionStatus;
  downloadUrl: string;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface GlobalNpmModulesReport {
  modules: GlobalNpmModule[];
  scannedAt: string;
  listError: string | null;
}
