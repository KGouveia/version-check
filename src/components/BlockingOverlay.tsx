import { Loader2 } from 'lucide-react';
import type { BlockingOperation } from '../types';
import { ScanProgressBar } from './ScanProgressBar';

interface BlockingOverlayProps {
  operation: BlockingOperation | null;
}

const IndeterminateProgressBar = () => (
  <div
    className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
    role="progressbar"
    aria-valuetext="In progress"
    aria-label="Operation in progress"
  >
    <div className="h-full w-full animate-pulse rounded-full bg-cyan-500/70" />
  </div>
);

export const BlockingOverlay = ({ operation }: BlockingOverlayProps) => {
  if (!operation) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-labelledby="blocking-overlay-title"
      aria-describedby={operation.subtitle ? 'blocking-overlay-subtitle' : undefined}
    >
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-4">
          <Loader2
            size={24}
            className="mt-0.5 shrink-0 animate-spin text-cyan-400"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 id="blocking-overlay-title" className="text-base font-medium text-zinc-50">
              {operation.title}
            </h2>
            {operation.subtitle && (
              <p id="blocking-overlay-subtitle" className="mt-1 text-sm text-zinc-400">
                {operation.subtitle}
              </p>
            )}
            <div className="mt-4">
              {operation.progress ? (
                <ScanProgressBar
                  progress={operation.progress}
                  itemLabel={operation.progressItemLabel ?? 'packages'}
                  className="px-0 py-0"
                />
              ) : (
                <IndeterminateProgressBar />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
