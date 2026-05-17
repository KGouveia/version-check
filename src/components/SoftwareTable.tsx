import { useMemo } from 'react';
import { Download } from 'lucide-react';
import {
  ALL_SOFTWARE_KINDS,
  SOFTWARE_KIND_LABELS,
  compareSoftwareByLabel,
} from '../constants/softwareCatalog';
import type { SoftwareKind, TrackedSoftware } from '../types';
import { latestVersionCellTone } from '../services/versionCompareDisplay';
import { StatusBadge } from './StatusBadge';

type SoftwareRow =
  | { mode: 'monitored'; item: TrackedSoftware }
  | { mode: 'unmonitored'; kind: SoftwareKind; label: string };

interface SoftwareTableProps {
  software: TrackedSoftware[];
  isLoading: boolean;
  isBusy: boolean;
  togglingKind: SoftwareKind | null;
  onToggleMonitor: (kind: SoftwareKind, enabled: boolean) => Promise<void>;
  onOpenDownload: (url: string) => Promise<void>;
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

const formatLatestMinorVersion = (item: TrackedSoftware) =>
  item.latestSameReleaseLineVersion ?? 'Unavailable';

const toneClass: Record<
  ReturnType<typeof latestVersionCellTone>,
  string
> = {
  neutral: 'text-zinc-300',
  good: 'text-emerald-400',
  bad: 'text-red-400',
};

const checkboxClass =
  'h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

const buildRows = (software: TrackedSoftware[]): SoftwareRow[] => {
  const trackedByKind = new Map(software.map((item) => [item.kind, item]));

  const monitored: SoftwareRow[] = [...software]
    .sort((a, b) => compareSoftwareByLabel(a.kind, b.kind))
    .map((item) => ({ mode: 'monitored' as const, item }));

  const unmonitored: SoftwareRow[] = ALL_SOFTWARE_KINDS.filter(
    (kind) => !trackedByKind.has(kind),
  )
    .sort(compareSoftwareByLabel)
    .map((kind) => ({
      mode: 'unmonitored' as const,
      kind,
      label: SOFTWARE_KIND_LABELS[kind],
    }));

  return [...monitored, ...unmonitored];
};

export const SoftwareTable = ({
  software,
  isLoading,
  isBusy,
  togglingKind,
  onToggleMonitor,
  onOpenDownload,
}: SoftwareTableProps) => {
  const rows = useMemo(() => buildRows(software), [software]);
  const firstUnmonitoredIndex = rows.findIndex((row) => row.mode === 'unmonitored');
  const hasMonitored = firstUnmonitoredIndex > 0;
  const hasUnmonitored = firstUnmonitoredIndex >= 0;

  const handleCheckboxChange = async (
    kind: SoftwareKind,
    enabled: boolean,
    isMonitored: boolean,
  ) => {
    if (isMonitored === enabled) {
      return;
    }
    await onToggleMonitor(kind, enabled);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="w-12 px-4 py-3 font-semibold">
              <span className="sr-only">Monitor</span>
            </th>
            <th className="px-4 py-3 font-semibold">Software</th>
            <th className="px-4 py-3 font-semibold">Local Version</th>
            <th className="px-4 py-3 font-semibold">Latest Minor Version</th>
            <th className="px-4 py-3 font-semibold">Latest Version</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Last Checked</th>
            <th className="px-6 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">
                Loading tracked software…
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const isSectionDivider =
                hasMonitored && hasUnmonitored && index === firstUnmonitoredIndex;

              if (row.mode === 'monitored') {
                const { item } = row;
                const minorTone = latestVersionCellTone(
                  item.kind,
                  item.currentVersion,
                  item.latestSameReleaseLineVersion,
                );
                const latestTone = latestVersionCellTone(
                  item.kind,
                  item.currentVersion,
                  item.latestVersion,
                );
                const isToggling = togglingKind === item.kind;
                const rowDisabled = isBusy || isToggling;

                return (
                  <tr
                    key={item.id}
                    className={`bg-zinc-950/80 transition-colors hover:bg-zinc-900/50 ${
                      isSectionDivider ? 'border-t-2 border-zinc-700' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked
                        disabled={rowDisabled}
                        onChange={() => handleCheckboxChange(item.kind, false, true)}
                        aria-label={`Stop monitoring ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-100">{item.name}</div>
                      {item.error && (
                        <div className="mt-1 max-w-72 truncate text-xs text-amber-300">
                          {item.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-zinc-300">
                      {item.currentVersion ?? 'Unavailable'}
                    </td>
                    <td
                      className={`px-4 py-4 font-mono ${toneClass[minorTone]}`}
                      title="Latest release matching your local major.minor line (e.g. all 3.13.x for Python 3.13.3). Green when your local version is the same as or newer than this; red when you are behind."
                    >
                      {formatLatestMinorVersion(item)}
                    </td>
                    <td
                      className={`px-4 py-4 font-mono ${toneClass[latestTone]}`}
                      title="Green when your local version is the same as or newer than this; red when you are behind."
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/40 text-zinc-300 transition hover:border-cyan-500/80 hover:bg-zinc-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => onOpenDownload(item.downloadUrl)}
                          disabled={rowDisabled}
                          title="Open download page"
                          aria-label={`Open ${item.name} download page`}
                        >
                          <Download size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              const { kind, label } = row;
              const isToggling = togglingKind === kind;
              const rowDisabled = isBusy || isToggling;

              return (
                <tr
                  key={kind}
                  className={`bg-zinc-950/40 text-zinc-500 ${
                    isSectionDivider ? 'border-t-2 border-zinc-700' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={false}
                      disabled={rowDisabled}
                      onChange={() => handleCheckboxChange(kind, true, false)}
                      aria-label={`Monitor ${label}`}
                    />
                  </td>
                  <td className="px-4 py-4 font-medium text-zinc-400">{label}</td>
                  <td className="px-4 py-4 font-mono text-zinc-600">—</td>
                  <td className="px-4 py-4 font-mono text-zinc-600">—</td>
                  <td className="px-4 py-4 font-mono text-zinc-600">—</td>
                  <td className="px-4 py-4 text-xs text-zinc-600">Not monitored</td>
                  <td className="px-4 py-4 text-zinc-600">—</td>
                  <td className="px-6 py-4" />
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
