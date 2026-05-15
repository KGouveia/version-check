import type { VersionStatus } from '../types';

const statusStyles: Record<VersionStatus, string> = {
  'up-to-date': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  outdated: 'border-red-500/30 bg-red-500/10 text-red-300',
  error: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  unknown: 'border-zinc-600 bg-zinc-800 text-zinc-300',
};

const statusLabels: Record<VersionStatus, string> = {
  'up-to-date': 'Up to date',
  outdated: 'Outdated',
  error: 'Error',
  unknown: 'Unknown',
};

interface StatusBadgeProps {
  status: VersionStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span
    className={`inline-flex min-w-24 items-center justify-center rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
  >
    {statusLabels[status]}
  </span>
);
