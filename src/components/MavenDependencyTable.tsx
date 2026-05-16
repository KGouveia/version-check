import { Download } from 'lucide-react';
import type { AnalyzedMavenDependency } from '../types';
import { latestVersionCellToneSimple } from '../services/versionCompareDisplay';
import { StatusBadge } from './StatusBadge';

interface MavenDependencyTableProps {
  dependencies: AnalyzedMavenDependency[];
  isBusy: boolean;
  onOpenArtifact: (groupId: string, artifactId: string) => Promise<void>;
}

const formatDate = (date: string | null) => {
  if (!date) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
};

const toneClass: Record<
  ReturnType<typeof latestVersionCellToneSimple>,
  string
> = {
  neutral: 'text-zinc-300',
  good: 'text-emerald-400',
  bad: 'text-red-400',
};

const coordinates = (dep: AnalyzedMavenDependency): string =>
  `${dep.groupId}:${dep.artifactId}`;

export const MavenDependencyTable = ({
  dependencies,
  isBusy,
  onOpenArtifact,
}: MavenDependencyTableProps) => {
  if (dependencies.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-zinc-400">
          No Maven Central–compatible dependencies were found in this pom.xml.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-6 py-3 font-semibold">Artifact</th>
            <th className="px-4 py-3 font-semibold">pom.xml version</th>
            <th className="px-4 py-3 font-semibold">Latest minor version</th>
            <th className="px-4 py-3 font-semibold">Latest version</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Last checked</th>
            <th className="px-6 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {dependencies.map((item) => {
            const minorTone = latestVersionCellToneSimple(
              item.compareVersion,
              item.latestSameReleaseLineVersion,
            );
            const latestTone = latestVersionCellToneSimple(
              item.compareVersion,
              item.latestVersion,
            );

            return (
              <tr key={item.id} className="bg-zinc-950/80">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{coordinates(item)}</span>
                    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                      {item.scope}
                    </span>
                  </div>
                  {item.error && (
                    <div className="mt-1 max-w-72 truncate text-xs text-amber-300">
                      {item.error}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 font-mono text-zinc-300">{item.declaredVersion}</td>
                <td
                  className={`px-4 py-4 font-mono ${toneClass[minorTone]}`}
                  title="Latest release on the same major.minor line as the inferred version from your declaration."
                >
                  {item.latestSameReleaseLineVersion ?? 'Unavailable'}
                </td>
                <td
                  className={`px-4 py-4 font-mono ${toneClass[latestTone]}`}
                  title="Latest stable release on Maven Central."
                >
                  {item.latestVersion ?? 'Unavailable'}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-zinc-400">
                  {formatDate(item.lastCheckedAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onOpenArtifact(item.groupId, item.artifactId)}
                      disabled={isBusy}
                      title="Open artifact on Maven Central"
                      aria-label={`Open ${coordinates(item)} on Maven Central`}
                    >
                      <Download size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
