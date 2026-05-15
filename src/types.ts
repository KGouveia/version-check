export type SoftwareKind = 'nodejs';

export type VersionStatus = 'unknown' | 'up-to-date' | 'outdated' | 'error';

export interface TrackedSoftware {
  id: string;
  name: string;
  kind: SoftwareKind;
  currentVersion: string | null;
  latestVersion: string | null;
  status: VersionStatus;
  downloadUrl: string;
  lastCheckedAt: string | null;
  error: string | null;
}

export interface AddSoftwareInput {
  name: string;
  kind: SoftwareKind;
}
