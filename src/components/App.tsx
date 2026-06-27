import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSearch, RefreshCw } from 'lucide-react';
import { SOFTWARE_KIND_LABELS } from '../constants/softwareCatalog';
import type {
  GlobalNpmModulesReport,
  GlobalPipModulesReport,
  GlobalPipUpgradeTarget,
  SoftwareKind,
  TrackedSoftware,
} from '../types';
import { useScanProgress } from '../hooks/useScanProgress';
import { deriveMainWindowBlockingOperation } from '../utils/deriveMainWindowBlockingOperation';
import { BlockingOverlay } from './BlockingOverlay';
import { CollapsibleSection } from './CollapsibleSection';
import { GlobalNpmModulesSection } from './GlobalNpmModulesSection';
import { GlobalPipModulesSection } from './GlobalPipModulesSection';
import { SoftwareTable } from './SoftwareTable';
import { formatDateTime } from '../utils/formatDateTime';
import { getLastScanAt, isScanStale } from '../utils/scanStaleness';

const secondaryButtonClass =
  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/50 px-3.5 py-2 text-sm font-medium leading-none text-zinc-200 whitespace-nowrap transition hover:border-cyan-500/80 hover:bg-zinc-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60';

export const App = () => {
  const { progress: scanProgress, runWithProgress } = useScanProgress();
  const [software, setSoftware] = useState<TrackedSoftware[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingKind, setTogglingKind] = useState<SoftwareKind | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isOpeningDeps, setIsOpeningDeps] = useState(false);
  const [isOpeningMavenDeps, setIsOpeningMavenDeps] = useState(false);
  const [isOpeningPipDeps, setIsOpeningPipDeps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalNpmReport, setGlobalNpmReport] = useState<GlobalNpmModulesReport | null>(null);
  const [isScanningGlobalNpm, setIsScanningGlobalNpm] = useState(false);
  const [upgradingNpmPackage, setUpgradingNpmPackage] = useState<string | null>(null);
  const [globalNpmError, setGlobalNpmError] = useState<string | null>(null);
  const [globalPipReport, setGlobalPipReport] = useState<GlobalPipModulesReport | null>(null);
  const [isScanningGlobalPip, setIsScanningGlobalPip] = useState(false);
  const [upgradingPipPackage, setUpgradingPipPackage] = useState<string | null>(null);
  const [globalPipError, setGlobalPipError] = useState<string | null>(null);

  const nodeEntry = software.find((item) => item.kind === 'nodejs');
  const showGlobalNpm = Boolean(
    nodeEntry?.currentVersion && nodeEntry.status !== 'error',
  );

  const pythonEntry = software.find((item) => item.kind === 'python');
  const showGlobalPip = Boolean(
    pythonEntry?.currentVersion && pythonEntry.status !== 'error',
  );

  const isBusy =
    togglingKind !== null ||
    isScanning ||
    isOpeningDeps ||
    isOpeningMavenDeps ||
    isOpeningPipDeps ||
    isScanningGlobalNpm ||
    isScanningGlobalPip ||
    upgradingNpmPackage !== null ||
    upgradingPipPackage !== null;

  const scanGlobalNpm = useCallback(async () => {
    setIsScanningGlobalNpm(true);
    setGlobalNpmError(null);

    try {
      const report = await runWithProgress(() => window.versionTracker.scanGlobalNpmModules());
      setGlobalNpmReport(report);
    } catch {
      setGlobalNpmError('Unable to scan global npm packages.');
    } finally {
      setIsScanningGlobalNpm(false);
    }
  }, [runWithProgress]);

  const scanGlobalPip = useCallback(async () => {
    setIsScanningGlobalPip(true);
    setGlobalPipError(null);

    try {
      const report = await runWithProgress(() => window.versionTracker.scanGlobalPipModules());
      setGlobalPipReport(report);
    } catch {
      setGlobalPipError('Unable to scan pip packages.');
    } finally {
      setIsScanningGlobalPip(false);
    }
  }, [runWithProgress]);

  useEffect(() => {
    window.versionTracker
      .listSoftware()
      .then(setSoftware)
      .catch(() => setError('Unable to load tracked software.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!showGlobalNpm) {
      setGlobalNpmReport(null);
      setGlobalNpmError(null);
    }
  }, [showGlobalNpm]);

  useEffect(() => {
    if (!showGlobalPip) {
      setGlobalPipReport(null);
      setGlobalPipError(null);
    }
  }, [showGlobalPip]);

  const toggleMonitor = async (kind: SoftwareKind, enabled: boolean) => {
    setTogglingKind(kind);
    setError(null);

    try {
      if (enabled) {
        const updatedSoftware = await window.versionTracker.addSoftware({
          kind,
          name: SOFTWARE_KIND_LABELS[kind],
        });
        setSoftware(updatedSoftware);
      } else {
        const tracked = software.find((item) => item.kind === kind);
        if (!tracked) {
          return;
        }
        const updatedSoftware = await window.versionTracker.deleteSoftware(tracked.id);
        setSoftware(updatedSoftware);
      }
    } catch {
      setError(
        enabled
          ? `Unable to add ${SOFTWARE_KIND_LABELS[kind]} tracker.`
          : `Unable to stop monitoring ${SOFTWARE_KIND_LABELS[kind]}.`,
      );
    } finally {
      setTogglingKind(null);
    }
  };

  const rescanAll = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const updatedSoftware = await window.versionTracker.rescanAll();
      setSoftware(updatedSoftware);
    } catch {
      setError('Unable to rescan tracked software.');
    } finally {
      setIsScanning(false);
    }
  };

  const openDownload = async (url: string) => {
    setError(null);

    try {
      await window.versionTracker.openDownload(url);
    } catch {
      setError('Unable to open the download page.');
    }
  };

  const openDependencyAnalyzer = async () => {
    setIsOpeningDeps(true);
    setError(null);

    try {
      await runWithProgress(() => window.versionTracker.openDependencyAnalyzer());
    } catch {
      setError('Unable to analyze package.json dependencies.');
    } finally {
      setIsOpeningDeps(false);
    }
  };

  const openMavenDependencyAnalyzer = async () => {
    setIsOpeningMavenDeps(true);
    setError(null);

    try {
      await runWithProgress(() => window.versionTracker.openMavenDependencyAnalyzer());
    } catch {
      setError('Unable to analyze pom.xml dependencies.');
    } finally {
      setIsOpeningMavenDeps(false);
    }
  };

  const openNpmPackage = async (packageName: string) => {
    setGlobalNpmError(null);

    try {
      await window.versionTracker.openNpmPackage(packageName);
    } catch {
      setGlobalNpmError('Unable to open the npm package page.');
    }
  };

  const upgradeGlobalNpmModule = async (packageName: string) => {
    setUpgradingNpmPackage(packageName);
    setGlobalNpmError(null);

    try {
      const report = await runWithProgress(() =>
        window.versionTracker.upgradeGlobalNpmModule(packageName),
      );
      setGlobalNpmReport(report);
    } catch {
      setGlobalNpmError(`Unable to upgrade ${packageName}.`);
    } finally {
      setUpgradingNpmPackage(null);
    }
  };

  const openPipPackage = async (packageName: string) => {
    setGlobalPipError(null);

    try {
      await window.versionTracker.openPipPackage(packageName);
    } catch {
      setGlobalPipError('Unable to open the PyPI package page.');
    }
  };

  const upgradeGlobalPipModule = async (packageName: string, target: GlobalPipUpgradeTarget) => {
    setUpgradingPipPackage(packageName);
    setGlobalPipError(null);

    try {
      const report = await runWithProgress(() =>
        window.versionTracker.upgradeGlobalPipModule(packageName, target),
      );
      setGlobalPipReport(report);
    } catch {
      setGlobalPipError(`Unable to upgrade ${packageName}.`);
    } finally {
      setUpgradingPipPackage(null);
    }
  };

  const openPipDependencyAnalyzer = async () => {
    setIsOpeningPipDeps(true);
    setError(null);

    try {
      await runWithProgress(() => window.versionTracker.openPipDependencyAnalyzer());
    } catch {
      setError('Unable to analyze pip packages.');
    } finally {
      setIsOpeningPipDeps(false);
    }
  };

  const globalNpmScanProgress = isScanningGlobalNpm ? scanProgress : null;
  const globalPipScanProgress = isScanningGlobalPip ? scanProgress : null;

  const blockingOperation = useMemo(
    () =>
      deriveMainWindowBlockingOperation({
        upgradingNpmPackage,
        upgradingPipPackage,
        isScanningGlobalNpm,
        isScanningGlobalPip,
        isScanning,
        isOpeningDeps,
        isOpeningMavenDeps,
        isOpeningPipDeps,
        togglingKind,
        scanProgress: scanProgress,
      }),
    [
      upgradingNpmPackage,
      upgradingPipPackage,
      isScanningGlobalNpm,
      isScanningGlobalPip,
      isScanning,
      isOpeningDeps,
      isOpeningMavenDeps,
      isOpeningPipDeps,
      togglingKind,
      scanProgress,
    ],
  );

  const lastScanAt = useMemo(() => getLastScanAt(software), [software]);
  const lastScanStale = isScanStale(lastScanAt);

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6"
        aria-hidden={blockingOperation ? true : undefined}
      >
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Software Version Tracker
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
              Track Node.js, Python, OpenJDK, Maven, and Git against current
              public releases.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={openDependencyAnalyzer}
              disabled={isBusy || isLoading}
              className={secondaryButtonClass}
              title="Analyze package.json dependencies"
            >
              <FileSearch size={16} className="shrink-0" aria-hidden="true" />
              {isOpeningDeps ? 'Analyzing…' : 'package.json'}
            </button>
            <button
              type="button"
              onClick={openMavenDependencyAnalyzer}
              disabled={isBusy || isLoading}
              className={secondaryButtonClass}
              title="Analyze pom.xml dependencies"
            >
              <FileSearch size={16} className="shrink-0" aria-hidden="true" />
              {isOpeningMavenDeps ? 'Analyzing…' : 'pom.xml'}
            </button>
            <button
              type="button"
              onClick={openPipDependencyAnalyzer}
              disabled={isBusy || isLoading}
              className={secondaryButtonClass}
              title="Analyze pip packages"
            >
              <FileSearch size={16} className="shrink-0" aria-hidden="true" />
              {isOpeningPipDeps ? 'Analyzing…' : 'pip packages'}
            </button>
          </div>
        </header>

        <CollapsibleSection
          title="Monitored software"
          disabled={isBusy}
          headerMeta={
            <span className={lastScanStale ? 'text-red-400' : 'text-zinc-500'}>
              Last scan: {formatDateTime(lastScanAt)}
            </span>
          }
          actions={
            <button
              type="button"
              onClick={rescanAll}
              disabled={isBusy || isLoading || software.length === 0}
              className={secondaryButtonClass}
              title="Re-check all tracked software"
            >
              <RefreshCw
                size={16}
                className={`shrink-0 ${isScanning ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {isScanning ? 'Scanning…' : 'Rescan all'}
            </button>
          }
          errorBanner={
            error ? (
              <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
                {error}
              </div>
            ) : undefined
          }
        >
          <SoftwareTable
            software={software}
            isLoading={isLoading}
            isBusy={isBusy}
            togglingKind={togglingKind}
            onToggleMonitor={toggleMonitor}
            onOpenDownload={openDownload}
          />
        </CollapsibleSection>

        {showGlobalNpm && (
          <GlobalNpmModulesSection
            report={globalNpmReport}
            isScanning={isScanningGlobalNpm}
            isUpgrading={upgradingNpmPackage !== null}
            scanProgress={globalNpmScanProgress}
            showInlineProgress={!blockingOperation}
            isBusy={isBusy}
            upgradingPackage={upgradingNpmPackage}
            sectionError={globalNpmError}
            onScan={() => void scanGlobalNpm()}
            onOpenNpm={openNpmPackage}
            onUpgrade={upgradeGlobalNpmModule}
          />
        )}

        {showGlobalPip && (
          <GlobalPipModulesSection
            report={globalPipReport}
            isScanning={isScanningGlobalPip}
            isUpgrading={upgradingPipPackage !== null}
            scanProgress={globalPipScanProgress}
            showInlineProgress={!blockingOperation}
            isBusy={isBusy}
            upgradingPackage={upgradingPipPackage}
            sectionError={globalPipError}
            onScan={() => void scanGlobalPip()}
            onOpenPip={openPipPackage}
            onUpgrade={upgradeGlobalPipModule}
          />
        )}
      </div>
      <BlockingOverlay operation={blockingOperation} />
    </main>
  );
};
