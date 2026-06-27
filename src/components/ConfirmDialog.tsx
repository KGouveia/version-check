import { TriangleAlert } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const cancelButtonClass =
  'inline-flex min-h-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500';

const confirmButtonClass =
  'inline-flex min-h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500';

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Uninstall',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!open) {
    return null;
  }

  const confirmClass = isDestructive
    ? `${confirmButtonClass} border-red-500/60 bg-red-500/10 text-red-300 hover:border-red-500 hover:bg-red-500/20`
    : `${confirmButtonClass} border-cyan-500/60 bg-cyan-500/10 text-cyan-300 hover:border-cyan-500 hover:bg-cyan-500/20`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-4">
          <TriangleAlert
            size={24}
            className="mt-0.5 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-medium text-zinc-50">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm text-zinc-400">
              {description}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={cancelButtonClass} onClick={onCancel}>
                {cancelLabel}
              </button>
              <button type="button" className={confirmClass} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
