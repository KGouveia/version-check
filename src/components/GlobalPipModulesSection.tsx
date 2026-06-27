import { RefreshCw } from 'lucide-react';
import type { GlobalPipModulesReport, GlobalPipUpgradeTarget, ScanProgress } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { GlobalPipModulesTable } from './GlobalPipModulesTable';
import { ScanProgressBar } from './ScanProgressBar';

const secondaryButtonClass =
  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/50 px-3.5 py-2 text-sm font-medium leading-none text-zinc-200 whitespace-nowrap transition hover:border-cyan-500/80 hover:bg-zinc-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60';

const errorBannerClass =
  'border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200';

interface GlobalPipModulesSectionProps {
  report: GlobalPipModulesReport | null;
  isScanning: boolean;
  isUpgrading: boolean;
  scanProgress: ScanProgress | null;
  showInlineProgress: boolean;
  isBusy: boolean;
  upgradingPackage: string | null;
  sectionError: string | null;
  onScan: () => void;
  onOpenPip: (packageName: string) => Promise<void>;
  onUpgrade: (packageName: string, target: GlobalPipUpgradeTarget) => Promise<void>;
}

export const GlobalPipModulesSection = ({
  report,
  isScanning,
  isUpgrading,
  scanProgress,
  showInlineProgress,
  isBusy,
  upgradingPackage,
  sectionError,
  onScan,
  onOpenPip,
  onUpgrade,
}: GlobalPipModulesSectionProps) => {
  const scanLabel = report ? 'Rescan' : 'Scan';
  const scanButtonLabel = isUpgrading ? 'Upgrading…' : isScanning ? 'Scanning…' : scanLabel;
  const scanButtonBusy = isScanning || isUpgrading;

  const errorBanner =
    sectionError || report?.listError || report?.vulnerabilityCheckError ? (
      <>
        {sectionError && <div className={errorBannerClass}>{sectionError}</div>}
        {report?.listError && !sectionError && (
          <div className={errorBannerClass}>{report.listError}</div>
        )}
        {report?.vulnerabilityCheckError && !sectionError && !report?.listError && (
          <div className={errorBannerClass}>
            Vulnerability check failed: {report.vulnerabilityCheckError}
          </div>
        )}
      </>
    ) : undefined;

  return (
    <CollapsibleSection
      className="mt-6"
      title="Pip packages (Python environment)"
      disabled={isBusy}
      subtitle={
        report?.pythonVersion ? (
          <p className="mt-0.5 text-xs text-zinc-500">Python {report.pythonVersion}</p>
        ) : undefined
      }
      actions={
        <button
          type="button"
          onClick={onScan}
          disabled={isBusy || isScanning || isUpgrading}
          className={secondaryButtonClass}
          title="List pip packages in the monitored Python environment and check index versions and OSV vulnerabilities"
        >
          <RefreshCw
            size={16}
            className={`shrink-0 ${scanButtonBusy ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {scanButtonLabel}
        </button>
      }
      errorBanner={errorBanner}
    >
      {isScanning && scanProgress && !report && showInlineProgress ? (
        <ScanProgressBar progress={scanProgress} itemLabel="packages" />
      ) : isScanning && !report ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-400">
          Scanning pip packages…
        </div>
      ) : !report && !isScanning ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-400">
          Click Scan to list pip packages in this Python environment and check index versions and OSV vulnerabilities.
        </div>
      ) : (
        <>
          {isScanning && scanProgress && showInlineProgress && (
            <ScanProgressBar progress={scanProgress} itemLabel="packages" />
          )}
          <GlobalPipModulesTable
            modules={report?.modules ?? []}
            pythonPipInvoke={report?.pythonPipInvoke ?? ''}
            isBusy={isBusy}
            upgradingPackage={upgradingPackage}
            onOpenPip={onOpenPip}
            onUpgrade={onUpgrade}
          />
        </>
      )}
    </CollapsibleSection>
  );
};
