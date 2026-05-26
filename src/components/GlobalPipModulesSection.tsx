import { RefreshCw } from 'lucide-react';
import type { GlobalPipModulesReport } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { GlobalPipModulesTable } from './GlobalPipModulesTable';

const secondaryButtonClass =
  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/50 px-3.5 py-2 text-sm font-medium leading-none text-zinc-200 whitespace-nowrap transition hover:border-cyan-500/80 hover:bg-zinc-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60';

const errorBannerClass =
  'border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200';

interface GlobalPipModulesSectionProps {
  report: GlobalPipModulesReport | null;
  isScanning: boolean;
  isBusy: boolean;
  upgradingPackage: string | null;
  sectionError: string | null;
  onScan: () => void;
  onOpenPip: (packageName: string) => Promise<void>;
  onUpgrade: (packageName: string) => Promise<void>;
}

export const GlobalPipModulesSection = ({
  report,
  isScanning,
  isBusy,
  upgradingPackage,
  sectionError,
  onScan,
  onOpenPip,
  onUpgrade,
}: GlobalPipModulesSectionProps) => {
  const scanLabel = report ? 'Rescan' : 'Scan';

  const errorBanner =
    sectionError || (report?.listError && !sectionError) ? (
      <>
        {sectionError && <div className={errorBannerClass}>{sectionError}</div>}
        {report?.listError && !sectionError && (
          <div className={errorBannerClass}>{report.listError}</div>
        )}
      </>
    ) : undefined;

  return (
    <CollapsibleSection
      className="mt-6"
      title="Pip packages (Python environment)"
      subtitle={
        report?.pythonVersion ? (
          <p className="mt-0.5 text-xs text-zinc-500">Python {report.pythonVersion}</p>
        ) : undefined
      }
      actions={
        <button
          type="button"
          onClick={onScan}
          disabled={isBusy || isScanning}
          className={secondaryButtonClass}
          title="List pip packages in the monitored Python environment and check PyPI versions"
        >
          <RefreshCw
            size={16}
            className={`shrink-0 ${isScanning ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isScanning ? 'Scanning…' : scanLabel}
        </button>
      }
      errorBanner={errorBanner}
    >
      {isScanning && !report ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-400">
          Scanning pip packages…
        </div>
      ) : !report && !isScanning ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-400">
          Click Scan to list pip packages in this Python environment and check PyPI versions.
        </div>
      ) : (
        <GlobalPipModulesTable
          modules={report?.modules ?? []}
          pythonPipInvoke={report?.pythonPipInvoke ?? ''}
          isBusy={isBusy}
          upgradingPackage={upgradingPackage}
          onOpenPip={onOpenPip}
          onUpgrade={onUpgrade}
        />
      )}
    </CollapsibleSection>
  );
};
