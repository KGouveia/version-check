import type { ScanProgress } from '../types';

interface ScanProgressBarProps {
  progress: ScanProgress;
  /** e.g. "packages" or "modules" */
  itemLabel?: string;
  className?: string;
}

export const ScanProgressBar = ({
  progress,
  itemLabel = 'packages',
  className = '',
}: ScanProgressBarProps) => {
  const { completed, total } = progress;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`px-6 py-4 ${className}`.trim()}>
      <p className="mb-2 text-sm text-zinc-400">
        Checking {itemLabel}… {completed} / {total}
      </p>
      <progress
        className="h-2 w-full overflow-hidden rounded-full accent-cyan-500"
        value={completed}
        max={total}
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Checking ${itemLabel}: ${percent}% complete`}
      />
    </div>
  );
};
