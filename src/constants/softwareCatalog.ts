import type { SoftwareKind } from '../types';

export const SOFTWARE_KIND_LABELS: Record<SoftwareKind, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  java: 'OpenJDK',
  maven: 'Maven',
  'codex-cli': 'Codex CLI',
};

export const ALL_SOFTWARE_KINDS: readonly SoftwareKind[] = [
  'nodejs',
  'python',
  'java',
  'maven',
  'codex-cli',
] as const;

export const compareSoftwareByLabel = (a: SoftwareKind, b: SoftwareKind): number =>
  SOFTWARE_KIND_LABELS[a].localeCompare(SOFTWARE_KIND_LABELS[b]);
