import { useEffect, useState } from 'react';
import { FileSearch, RefreshCw } from 'lucide-react';
import type { DependencyAnalysisReport } from '../types';
import { DependencyTable } from './DependencyTable';

export const DependencyAnalyzerApp = () => {
  const [report, setReport] = useState<DependencyAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isChangingFile, setIsChangingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isScanning || isChangingFile;

  useEffect(() => {
    window.versionTracker
      .getDependencyReport()
      .then(setReport)
      .catch(() => setError('No dependency analysis is available. Close this window and open one from the main app.'))
      .finally(() => setIsLoading(false));
  }, []);

  const rescan = async () => {
    if (!report) {
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const updated = await window.versionTracker.rescanDependencies(report);
      setReport(updated);
    } catch {
      setError('Unable to rescan dependencies.');
    } finally {
      setIsScanning(false);
    }
  };

  const changePackageJson = async () => {
    setIsChangingFile(true);
    setError(null);

    try {
      const updated = await window.versionTracker.changePackageJson();
      setReport(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message !== 'File selection was canceled.') {
        setError('Unable to load the selected package.json.');
      }
    } finally {
      setIsChangingFile(false);
    }
  };

  const openNpm = async (packageName: string) => {
    setError(null);

    try {
      await window.versionTracker.openNpmPackage(packageName);
    } catch {
      setError('Unable to open the npm package page.');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-50">
              Dependency versions
            </h1>
            {report && (
              <>
                <p className="mt-1 text-sm font-medium text-zinc-300">{report.projectLabel}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500" title={report.packageJsonPath}>
                  {report.packageJsonPath}
                </p>
              </>
            )}
            {!report && !isLoading && (
              <p className="mt-1 text-sm text-zinc-400">
                Compare package.json ranges against npm registry releases.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={changePackageJson}
              disabled={isBusy || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSearch size={16} aria-hidden="true" />
              {isChangingFile ? 'Selecting…' : 'Change package.json'}
            </button>
            <button
              type="button"
              onClick={rescan}
              disabled={isBusy || isLoading || !report}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={isScanning ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              {isScanning ? 'Scanning' : 'Rescan'}
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/20">
          {error && (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-400">
              Loading dependency analysis...
            </div>
          ) : report ? (
            <DependencyTable
              dependencies={report.dependencies}
              isBusy={isBusy}
              onOpenNpm={openNpm}
            />
          ) : (
            <div className="px-6 py-12 text-center text-sm text-zinc-400">
              No analysis to display.
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
