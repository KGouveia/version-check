import type { SoftwareKind } from '../types';
import { normalizeJavaForCompare } from './javaVersionNormalize';
import { compareVersions } from './semver';

/**
 * Compare local vs a reference version string shown in the UI (e.g. latest from a registry).
 * Returns null when either side is missing. Uses the same semver-style rules as status checks;
 * Java strings may use dotted or `major+build` forms.
 */
export const compareLocalToReference = (
  kind: SoftwareKind,
  current: string | null | undefined,
  reference: string | null | undefined,
): number | null => {
  if (!current?.trim() || !reference?.trim()) {
    return null;
  }

  const c = kind === 'java' ? normalizeJavaForCompare(current.trim()) : current.trim();
  const r = kind === 'java' ? normalizeJavaForCompare(reference.trim()) : reference.trim();

  return compareVersions(c, r);
};

export type LatestVersionCellTone = 'neutral' | 'good' | 'bad';

/** Green when local is same or newer than the reference; red when strictly behind. */
export const latestVersionCellTone = (
  kind: SoftwareKind,
  current: string | null | undefined,
  reference: string | null | undefined,
): LatestVersionCellTone => {
  const cmp = compareLocalToReference(kind, current, reference);
  if (cmp === null) {
    return 'neutral';
  }

  if (cmp >= 0) {
    return 'good';
  }

  return 'bad';
};
