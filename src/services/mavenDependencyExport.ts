import path from 'node:path';
import type { AnalyzedMavenDependency, MavenDependencyAnalysisReport, VersionStatus } from '../types';
import { STATUS_DISPLAY_ORDER } from './dependencyExport';

export const MAVEN_DEPENDENCY_ANALYSIS_EXPORT_FILENAME = 'maven-dependency-analysis.md';

const escapeTableCell = (value: string): string => value.replace(/\|/g, '\\|');

const cell = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return escapeTableCell(value);
};

const coordinates = (dep: AnalyzedMavenDependency): string =>
  `${dep.groupId}:${dep.artifactId}`;

const compareDependencies = (a: AnalyzedMavenDependency, b: AnalyzedMavenDependency): number => {
  const scopeOrder = String(a.scope).localeCompare(String(b.scope));

  if (scopeOrder !== 0) {
    return scopeOrder;
  }

  return coordinates(a).localeCompare(coordinates(b));
};

const countByStatus = (dependencies: AnalyzedMavenDependency[]): string => {
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
  dependencies: AnalyzedMavenDependency[],
): string => {
  const rows = dependencies
    .filter((dep) => dep.status === status)
    .sort(compareDependencies);

  if (rows.length === 0) {
    return '';
  }

  const header =
    '| Coordinates | Scope | Declared | Resolved | Latest (same minor line) | Latest (Central) | Central | Error |';
  const separator =
    '|-------------|-------|----------|----------|--------------------------|------------------|---------|-------|';

  const body = rows
    .map((dep) => {
      const label = escapeTableCell(coordinates(dep));
      const centralLink = `[${label}](${dep.downloadUrl})`;

      return `| ${cell(coordinates(dep))} | ${cell(String(dep.scope))} | ${cell(dep.declaredVersion)} | ${cell(dep.compareVersion)} | ${cell(dep.latestSameReleaseLineVersion)} | ${cell(dep.latestVersion)} | ${centralLink} | ${cell(dep.error)} |`;
    })
    .join('\n');

  return `## ${status}\n\n${header}\n${separator}\n${body}\n`;
};

export const mavenDependencyAnalysisExportPath = (pomXmlPath: string): string =>
  path.join(path.dirname(pomXmlPath), MAVEN_DEPENDENCY_ANALYSIS_EXPORT_FILENAME);

export const formatMavenDependencyAnalysisMarkdown = (
  report: MavenDependencyAnalysisReport,
): string => {
  const counts = countByStatus(report.dependencies);

  const metadata = [
    '# Maven dependency analysis',
    '',
    `- **project**: ${escapeTableCell(report.projectLabel)}`,
    `- **pomXmlPath**: ${escapeTableCell(report.pomXmlPath)}`,
    `- **analyzedAt**: ${report.analyzedAt}`,
    `- **counts**: ${counts || 'none'}`,
    '',
  ].join('\n');

  const tables = STATUS_DISPLAY_ORDER.map((status) =>
    formatStatusTable(status, report.dependencies),
  )
    .filter((section) => section.length > 0)
    .join('\n');

  return `${metadata}\n${tables}`.trimEnd() + '\n';
};
