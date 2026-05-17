import { useState } from 'react';
import { Copy } from 'lucide-react';
import type { AnalyzedPipDependency } from '../types';
import { formatPipUpgradeCommand } from '../services/pipUpgradeCommand';
import { latestVersionCellToneSimple } from '../services/versionCompareDisplay';
import { StatusBadge } from './StatusBadge';

interface PipDependencyTableProps {
  dependencies: AnalyzedPipDependency[];
  pythonPipInvoke: string;
  isBusy: boolean;
  onCopyError?: (message: string) => void;
}

const formatDate = (date: string | null) => {
  if (!date) {
    return 'Never';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
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

const canCopyUpgrade = (item: AnalyzedPipDependency): boolean =>
  item.status !== 'up-to-date' && Boolean(item.latestVersion);

export const PipDependencyTable = ({
  dependencies,
  pythonPipInvoke,
  isBusy,
  onCopyError,
}: PipDependencyTableProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyUpgradeCommand = async (item: AnalyzedPipDependency) => {
    if (!item.latestVersion) {
      return;
    }

    const command = formatPipUpgradeCommand(
      pythonPipInvoke,
      item.name,
      item.latestVersion,
    );

    try {
      await navigator.clipboard.writeText(command);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 2000);
    } catch {
      onCopyError?.('Unable to copy the upgrade command to the clipboard.');
    }
  };

  if (dependencies.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-zinc-400">No pip packages were found in this environment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[6%]" />
        </colgroup>
        <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-2 py-2 font-semibold">Package</th>
            <th className="px-2 py-2 font-semibold">Installed</th>
            <th className="px-2 py-2 font-semibold">Latest minor</th>
            <th className="px-2 py-2 font-semibold">Latest</th>
            <th className="px-2 py-2 font-semibold">Status</th>
            <th className="px-2 py-2 font-semibold">Checked</th>
            <th className="px-2 py-2 text-right font-semibold">
              <span className="sr-only">Copy upgrade command</span>
            </th>
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
            const copyEnabled = canCopyUpgrade(item);
            const upgradeCommand =
              item.latestVersion &&
              formatPipUpgradeCommand(pythonPipInvoke, item.name, item.latestVersion);
            const isCopied = copiedId === item.id;

            return (
              <tr key={item.id} className="bg-zinc-950/80">
                <td className="px-2 py-2">
                  <span
                    className="block max-w-full truncate font-medium text-zinc-100"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  {item.error && (
                    <div
                      className="mt-0.5 truncate text-[11px] text-amber-300"
                      title={item.error}
                    >
                      {item.error}
                    </div>
                  )}
                </td>
                <td className="truncate px-2 py-2 font-mono text-xs text-zinc-300">
                  {item.installedVersion}
                </td>
                <td
                  className={`truncate px-2 py-2 font-mono text-xs ${toneClass[minorTone]}`}
                  title="Latest release on the same major.minor line as the installed version."
                >
                  {item.latestSameReleaseLineVersion ?? '—'}
                </td>
                <td
                  className={`truncate px-2 py-2 font-mono text-xs ${toneClass[latestTone]}`}
                  title="Latest stable release on PyPI."
                >
                  {item.latestVersion ?? '—'}
                </td>
                <td className="px-2 py-2">
                  <StatusBadge status={item.status} compact />
                </td>
                <td className="truncate px-2 py-2 text-xs text-zinc-400">
                  {formatDate(item.lastCheckedAt)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-zinc-300 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        isCopied
                          ? 'border-cyan-500 text-cyan-300'
                          : 'border-zinc-700 hover:border-cyan-500 hover:text-cyan-300'
                      }`}
                      onClick={() => copyUpgradeCommand(item)}
                      disabled={isBusy || !copyEnabled}
                      title={
                        upgradeCommand
                          ? upgradeCommand
                          : 'Already up to date or latest version unknown'
                      }
                      aria-label={
                        isCopied
                          ? `Copied upgrade command for ${item.name}`
                          : `Copy upgrade command for ${item.name}`
                      }
                    >
                      <Copy size={14} aria-hidden="true" />
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
