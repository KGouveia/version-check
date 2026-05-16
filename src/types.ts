export type SoftwareKind = 'nodejs' | 'python' | 'java' | 'maven' | 'codex-cli';

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
   * Node: from index.json; Python: from python.org API; Java: same-major OpenJDK release as latestVersion; Maven: GitHub apache/maven releases; Codex CLI: from npm package versions.
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
