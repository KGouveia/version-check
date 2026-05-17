import type { VersionStatus } from '../types';

const statusStyles: Record<VersionStatus, string> = {
  'up-to-date': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  outdated: 'border-red-500/30 bg-red-500/10 text-red-300',
  'outdated-major': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  'outdated-minor': 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  error: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  unknown: 'border-zinc-600 bg-zinc-800 text-zinc-300',
};

const statusLabels: Record<VersionStatus, string> = {
  'up-to-date': 'Up to date',
  outdated: 'Outdated',
  'outdated-major': 'Major update',
  'outdated-minor': 'Minor update',
  error: 'Error',
  unknown: 'Unknown',
};

interface StatusBadgeProps {
  status: VersionStatus;
  compact?: boolean;
}

export const StatusBadge = ({ status, compact = false }: StatusBadgeProps) => (
  <span
    className={`inline-flex items-center justify-center rounded-full border font-medium ${
      compact
        ? 'min-w-0 px-2 py-0.5 text-[11px] leading-tight'
        : 'min-w-24 px-3 py-1 text-xs'
    } ${statusStyles[status]}`}
  >
    {statusLabels[status]}
  </span>
);
