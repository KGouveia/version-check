import { useEffect, useState } from 'react';
import { FileDown, FileSearch, RefreshCw } from 'lucide-react';
import type { MavenDependencyAnalysisReport } from '../types';
import { MavenDependencyTable } from './MavenDependencyTable';

export const MavenDependencyAnalyzerApp = () => {
  const [report, setReport] = useState<MavenDependencyAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isChangingFile, setIsChangingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isBusy = isScanning || isChangingFile || isExporting;

  useEffect(() => {
    window.versionTracker
      .getMavenDependencyReport()
      .then(setReport)
      .catch(() =>
        setError(
          'No Maven dependency analysis is available. Close this window and open one from the main app.',
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const rescan = async () => {
    if (!report) {
      return;
    }

    setIsScanning(true);
    setError(null);
    setExportMessage(null);

    try {
      const updated = await window.versionTracker.rescanMavenDependencies(report);
      setReport(updated);
    } catch {
      setError('Unable to rescan dependencies.');
    } finally {
      setIsScanning(false);
    }
  };

  const changePomXml = async () => {
    setIsChangingFile(true);
    setError(null);
    setExportMessage(null);

    try {
      const updated = await window.versionTracker.changePomXml();
      setReport(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message !== 'File selection was canceled.') {
        setError('Unable to load the selected pom.xml.');
      }
    } finally {
      setIsChangingFile(false);
    }
  };

  const openArtifact = async (groupId: string, artifactId: string) => {
    setError(null);

    try {
      await window.versionTracker.openMavenArtifact(groupId, artifactId);
    } catch {
      setError('Unable to open the Maven Central artifact page.');
    }
  };

  const exportAnalysis = async () => {
    if (!report) {
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportMessage(null);

    try {
      const { filePath } = await window.versionTracker.exportMavenDependencyReport(report);
      setExportMessage(`Exported to ${filePath}`);
    } catch {
      setError('Unable to export dependency analysis.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-50">
              Maven dependency versions
            </h1>
            {report && (
              <>
                <p className="mt-1 text-sm font-medium text-zinc-300">{report.projectLabel}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500" title={report.pomXmlPath}>
                  {report.pomXmlPath}
                </p>
              </>
            )}
            {!report && !isLoading && (
              <p className="mt-1 text-sm text-zinc-400">
                Compare pom.xml declarations against Maven Central releases.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={changePomXml}
              disabled={isBusy || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSearch size={16} aria-hidden="true" />
              {isChangingFile ? 'Selecting…' : 'Change pom.xml'}
            </button>
            <button
              type="button"
              onClick={exportAnalysis}
              disabled={isBusy || isLoading || !report}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileDown size={16} aria-hidden="true" />
              {isExporting ? 'Exporting…' : 'Export analysis'}
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
          {exportMessage && (
            <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-3 text-sm text-emerald-200">
              {exportMessage}
            </div>
          )}

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
            <MavenDependencyTable
              dependencies={report.dependencies}
              isBusy={isBusy}
              onOpenArtifact={openArtifact}
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
