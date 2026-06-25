import { RefreshCw } from 'lucide-react';
import type { GlobalNpmModulesReport, ScanProgress } from '../types';
import { CollapsibleSection } from './CollapsibleSection';
import { GlobalNpmModulesTable } from './GlobalNpmModulesTable';
import { ScanProgressBar } from './ScanProgressBar';

const secondaryButtonClass =
  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/50 px-3.5 py-2 text-sm font-medium leading-none text-zinc-200 whitespace-nowrap transition hover:border-cyan-500/80 hover:bg-zinc-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60';

const errorBannerClass =
  'border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200';

interface GlobalNpmModulesSectionProps {
  report: GlobalNpmModulesReport | null;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  isBusy: boolean;
  upgradingPackage: string | null;
  sectionError: string | null;
  onScan: () => void;
  onOpenNpm: (packageName: string) => Promise<void>;
  onUpgrade: (packageName: string) => Promise<void>;
}

export const GlobalNpmModulesSection = ({
  report,
  isScanning,
  scanProgress,
  isBusy,
  upgradingPackage,
  sectionError,
  onScan,
  onOpenNpm,
  onUpgrade,
}: GlobalNpmModulesSectionProps) => {
  const scanLabel = report ? 'Rescan' : 'Scan';

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
      title="Global npm modules"
      actions={
        <button
          type="button"
          onClick={onScan}
          disabled={isBusy || isScanning}
          className={secondaryButtonClass}
          title="List global npm packages and check registry versions and OSV vulnerabilities"
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
      {isScanning && scanProgress && !report ? (
        <ScanProgressBar progress={scanProgress} itemLabel="modules" />
      ) : isScanning && !report ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-400">
          Scanning global npm packages…
        </div>
      ) : !report && !isScanning ? (
        <div className="px-6 py-12 text-center text-sm text-zinc-400">
          Click Scan to list global npm packages and check registry versions and OSV vulnerabilities.
        </div>
      ) : (
        <>
          {isScanning && scanProgress && (
            <ScanProgressBar progress={scanProgress} itemLabel="modules" />
          )}
          <GlobalNpmModulesTable
            modules={report?.modules ?? []}
            isBusy={isBusy}
            upgradingPackage={upgradingPackage}
            onOpenNpm={onOpenNpm}
            onUpgrade={onUpgrade}
          />
        </>
      )}
    </CollapsibleSection>
  );
};
