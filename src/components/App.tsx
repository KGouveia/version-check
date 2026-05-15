import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { TrackedSoftware } from '../types';
import { AddSoftwareForm } from './AddSoftwareForm';
import { SoftwareTable } from './SoftwareTable';

export const App = () => {
  const [software, setSoftware] = useState<TrackedSoftware[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isAdding || isScanning;

  useEffect(() => {
    window.versionTracker
      .listSoftware()
      .then(setSoftware)
      .catch(() => setError('Unable to load tracked software.'))
      .finally(() => setIsLoading(false));
  }, []);

  const addSoftware = async (name: string) => {
    setIsAdding(true);
    setError(null);

    try {
      const updatedSoftware = await window.versionTracker.addSoftware({
        name,
        kind: 'nodejs',
      });
      setSoftware(updatedSoftware);
    } catch {
      setError('Unable to add Node.js tracker.');
    } finally {
      setIsAdding(false);
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

  const deleteSoftware = async (id: string) => {
    setError(null);

    try {
      const updatedSoftware = await window.versionTracker.deleteSoftware(id);
      setSoftware(updatedSoftware);
    } catch {
      setError('Unable to delete tracked software.');
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-50">
              Software Version Tracker
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Track installed Node.js against the latest public release.
            </p>
          </div>
          <button
            type="button"
            onClick={rescanAll}
            disabled={isBusy || isLoading || software.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={isScanning ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            {isScanning ? 'Scanning' : 'Manual Rescan'}
          </button>
        </header>

        <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/20">
          <AddSoftwareForm isAdding={isAdding} onAdd={addSoftware} />

          {error && (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-400">
              Loading tracked software...
            </div>
          ) : (
            <SoftwareTable
              software={software}
              isBusy={isBusy}
              onDelete={deleteSoftware}
              onOpenDownload={openDownload}
            />
          )}
        </section>
      </div>
    </main>
  );
};
