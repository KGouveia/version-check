import { Download, Trash2 } from 'lucide-react';
import type { TrackedSoftware } from '../types';
import { StatusBadge } from './StatusBadge';

interface SoftwareTableProps {
  software: TrackedSoftware[];
  isBusy: boolean;
  onDelete: (id: string) => Promise<void>;
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

export const SoftwareTable = ({
  software,
  isBusy,
  onDelete,
  onOpenDownload,
}: SoftwareTableProps) => {
  if (software.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-zinc-400">No software is currently tracked.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/70 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-6 py-3 font-semibold">Software</th>
            <th className="px-4 py-3 font-semibold">Local Version</th>
            <th className="px-4 py-3 font-semibold">Latest Version</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Last Checked</th>
            <th className="px-6 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {software.map((item) => (
            <tr key={item.id} className="bg-zinc-950/80">
              <td className="px-6 py-4">
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
              <td className="px-4 py-4 font-mono text-zinc-300">
                {item.latestVersion ?? 'Unavailable'}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={item.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-zinc-400">
                {formatDate(item.lastCheckedAt)}
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => onOpenDownload(item.downloadUrl)}
                    disabled={isBusy}
                    title="Open download page"
                    aria-label={`Open ${item.name} download page`}
                  >
                    <Download size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:border-red-500 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => onDelete(item.id)}
                    disabled={isBusy}
                    title="Delete"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
