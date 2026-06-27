import path from 'node:path';
import type { AnalyzedDependency, DependencyAnalysisReport, VersionStatus } from '../types';
import { formatVulnerabilityCount } from './vulnerabilityExport';

export const DEPENDENCY_ANALYSIS_EXPORT_FILENAME = 'dependency-analysis.md';

export const STATUS_DISPLAY_ORDER: VersionStatus[] = [
  'outdated-major',
  'outdated',
  'outdated-minor',
  'error',
  'unknown',
  'up-to-date',
];

const SECTION_LABEL: Record<AnalyzedDependency['section'], string> = {
  dependencies: 'prod',
  devDependencies: 'dev',
};

const escapeTableCell = (value: string): string => value.replace(/\|/g, '\\|');

const cell = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return escapeTableCell(value);
};

const compareDependencies = (a: AnalyzedDependency, b: AnalyzedDependency): number => {
  const sectionOrder = a.section.localeCompare(b.section);

  if (sectionOrder !== 0) {
    return sectionOrder;
  }

  return a.name.localeCompare(b.name);
};

const countByStatus = (dependencies: AnalyzedDependency[]): string => {
  const counts = new Map<VersionStatus, number>();

  for (const dep of dependencies) {
    counts.set(dep.status, (counts.get(dep.status) ?? 0) + 1);
  }

  return STATUS_DISPLAY_ORDER.filter((status) => counts.has(status))
    .map((status) => `${status}: ${counts.get(status)}`)
    .join(', ');
};

const formatStatusTable = (status: VersionStatus, dependencies: AnalyzedDependency[]): string => {
  const rows = dependencies
    .filter((dep) => dep.status === status)
    .sort(compareDependencies);

  if (rows.length === 0) {
    return '';
  }

  const header =
    '| Package | Section | Declared | Resolved | Latest (same minor line) | Latest (registry) | Vulnerabilities | npm | Error |';
  const separator =
    '|---------|---------|----------|----------|--------------------------|-------------------|-----------------|-----|-------|';

  const body = rows
    .map((dep) => {
      const npmLink = `[${escapeTableCell(dep.name)}](${dep.downloadUrl})`;

      return `| ${cell(dep.name)} | ${SECTION_LABEL[dep.section]} | ${cell(dep.declaredVersion)} | ${cell(dep.compareVersion)} | ${cell(dep.latestSameReleaseLineVersion)} | ${cell(dep.latestVersion)} | ${formatVulnerabilityCount(dep.vulnerabilityCount)} | ${npmLink} | ${cell(dep.error)} |`;
    })
    .join('\n');

  return `## ${status}\n\n${header}\n${separator}\n${body}\n`;
};

export const dependencyAnalysisExportPath = (packageJsonPath: string): string =>
  path.join(path.dirname(packageJsonPath), DEPENDENCY_ANALYSIS_EXPORT_FILENAME);

export const formatDependencyAnalysisMarkdown = (
  report: DependencyAnalysisReport,
): string => {
  const counts = countByStatus(report.dependencies);

  const metadata = [
    '# Dependency analysis',
    '',
    `- **project**: ${escapeTableCell(report.projectLabel)}`,
    `- **packageJsonPath**: ${escapeTableCell(report.packageJsonPath)}`,
    `- **analyzedAt**: ${report.analyzedAt}`,
    `- **counts**: ${counts || 'none'}`,
    report.vulnerabilityCheckError
      ? `- **vulnerabilityCheckError**: ${escapeTableCell(report.vulnerabilityCheckError)}`
      : null,
    '',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const tables = STATUS_DISPLAY_ORDER.map((status) =>
    formatStatusTable(status, report.dependencies),
  )
    .filter((section) => section.length > 0)
    .join('\n');

  return `${metadata}\n${tables}`.trimEnd() + '\n';
};
