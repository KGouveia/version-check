import { ArrowUp, Download } from 'lucide-react';
import type { GlobalPipModule } from '../types';
import {
  canUpgradeGlobalPipModule,
  resolveGlobalPipUpgradeSpec,
} from '../services/globalPipUpgradePolicy';
import { latestVersionCellToneSimple } from '../services/versionCompareDisplay';
import { StatusBadge } from './StatusBadge';
import { VulnerabilityCountCell } from './VulnerabilityCountCell';

interface GlobalPipModulesTableProps {
  modules: GlobalPipModule[];
  pythonPipInvoke: string;
  isBusy: boolean;
  upgradingPackage: string | null;
  onOpenPip: (packageName: string) => Promise<void>;
  onUpgrade: (packageName: string) => Promise<void>;
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

export const GlobalPipModulesTable = ({
  modules,
  pythonPipInvoke,
  isBusy,
  upgradingPackage,
  onOpenPip,
  onUpgrade,
}: GlobalPipModulesTableProps) => {
  if (modules.length === 0) {
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
          <col className="w-[20%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-2 py-2 font-semibold">Package</th>
            <th className="px-2 py-2 font-semibold">Installed</th>
            <th className="px-2 py-2 font-semibold">Latest minor</th>
            <th className="px-2 py-2 font-semibold">Latest</th>
            <th className="px-2 py-2 font-semibold">Status</th>
            <th className="px-2 py-2 font-semibold">Vulnerabilities</th>
            <th className="px-2 py-2 font-semibold">Checked</th>
            <th className="px-2 py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {modules.map((item) => {
            const minorTone = latestVersionCellToneSimple(
              item.compareVersion,
              item.latestSameReleaseLineVersion,
            );
            const latestTone = latestVersionCellToneSimple(
              item.compareVersion,
              item.latestVersion,
            );
            const upgradeEnabled = canUpgradeGlobalPipModule(item);
            let upgradeSpec: string | null = null;

            if (upgradeEnabled) {
              try {
                upgradeSpec = resolveGlobalPipUpgradeSpec(item);
              } catch {
                upgradeSpec = null;
              }
            }

            const isUpgrading = upgradingPackage === item.name;

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
                  title="Latest stable release on the configured pip index."
                >
                  {item.latestVersion ?? '—'}
                </td>
                <td className="px-2 py-2">
                  <StatusBadge status={item.status} compact />
                </td>
                <td className="px-2 py-2">
                  <VulnerabilityCountCell count={item.vulnerabilityCount} compact />
                </td>
                <td className="truncate px-2 py-2 text-xs text-zinc-400">
                  {formatDate(item.lastCheckedAt)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => onOpenPip(item.name)}
                      disabled={isBusy}
                      title="Open PyPI package page"
                      aria-label={`Open ${item.name} on PyPI`}
                    >
                      <Download size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => onUpgrade(item.name)}
                      disabled={isBusy || !upgradeEnabled || !upgradeSpec}
                      title={
                        upgradeEnabled && upgradeSpec
                          ? `Upgrade ${item.name} (${pythonPipInvoke} install --upgrade ${item.name}==${upgradeSpec})`
                          : 'No upgrade available'
                      }
                      aria-label={
                        isUpgrading
                          ? `Upgrading ${item.name}`
                          : `Upgrade ${item.name} to latest`
                      }
                    >
                      <ArrowUp
                        size={14}
                        className={isUpgrading ? 'animate-pulse' : ''}
                        aria-hidden="true"
                      />
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
