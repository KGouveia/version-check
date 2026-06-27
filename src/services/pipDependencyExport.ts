import path from 'node:path';
import type { AnalyzedPipDependency, PipDependencyAnalysisReport, VersionStatus } from '../types';
import { STATUS_DISPLAY_ORDER } from './dependencyExport';
import { formatVulnerabilityCount } from './vulnerabilityExport';

const storageDirectoryName = 'Software Version Tracker';
export const PIP_DEPENDENCY_ANALYSIS_EXPORT_FILENAME = 'pip-dependency-analysis.md';

const escapeTableCell = (value: string): string => value.replace(/\|/g, '\\|');

const cell = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return escapeTableCell(value);
};

const compareDependencies = (a: AnalyzedPipDependency, b: AnalyzedPipDependency): number =>
  a.name.localeCompare(b.name);

const countByStatus = (dependencies: AnalyzedPipDependency[]): string => {
  const counts = new Map<VersionStatus, number>();

  for (const dep of dependencies) {
    counts.set(dep.status, (counts.get(dep.status) ?? 0) + 1);
  }

  return STATUS_DISPLAY_ORDER.filter((status) => counts.has(status))
    .map((status) => `${status}: ${counts.get(status)}`)
    .join(', ');
};

const formatStatusTable = (
  status: VersionStatus,
  dependencies: AnalyzedPipDependency[],
): string => {
  const rows = dependencies
    .filter((dep) => dep.status === status)
    .sort(compareDependencies);

  if (rows.length === 0) {
    return '';
  }

  const header =
    '| Package | Installed | Resolved | Latest (same minor line) | Latest (index) | Vulnerabilities | Index | Error |';
  const separator =
    '|---------|-----------|----------|--------------------------|---------------|-----------------|------|-------|';

  const body = rows
    .map((dep) => {
      const label = escapeTableCell(dep.name);
      const pypiLink = `[${label}](${dep.downloadUrl})`;

      return `| ${cell(dep.name)} | ${cell(dep.installedVersion)} | ${cell(dep.compareVersion)} | ${cell(dep.latestSameReleaseLineVersion)} | ${cell(dep.latestVersion)} | ${formatVulnerabilityCount(dep.vulnerabilityCount)} | ${pypiLink} | ${cell(dep.error)} |`;
    })
    .join('\n');

  return `## ${status}\n\n${header}\n${separator}\n${body}\n`;
};

export const pipDependencyAnalysisExportPath = (appDataPath: string): string =>
  path.join(appDataPath, storageDirectoryName, PIP_DEPENDENCY_ANALYSIS_EXPORT_FILENAME);

export const formatPipDependencyAnalysisMarkdown = (
  report: PipDependencyAnalysisReport,
): string => {
  const counts = countByStatus(report.dependencies);

  const metadata = [
    '# Pip dependency analysis',
    '',
    `- **environment**: ${escapeTableCell(report.projectLabel)}`,
    `- **pythonPipInvoke**: ${escapeTableCell(report.pythonPipInvoke)}`,
    `- **analyzedAt**: ${report.analyzedAt}`,
    `- **counts**: ${counts || 'none'}`,
    report.vulnerabilityCheckError
      ? `- **vulnerabilityCheckError**: ${escapeTableCell(report.vulnerabilityCheckError)}`
      : null,
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const tables = STATUS_DISPLAY_ORDER.map((status) =>
    formatStatusTable(status, report.dependencies),
  )
    .filter((section) => section.length > 0)
    .join('\n');

  return `${metadata}\n${tables}`.trimEnd() + '\n';
};
