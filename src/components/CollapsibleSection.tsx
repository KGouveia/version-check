import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: ReactNode;
  headerMeta?: ReactNode;
  actions?: ReactNode;
  errorBanner?: ReactNode;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

const sectionClass =
  'overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950 shadow-xl shadow-black/30';

const toggleButtonClass =
  'inline-flex min-w-0 items-center gap-2 rounded-md text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500';

const toggleButtonEnabledClass = `${toggleButtonClass} hover:text-cyan-300`;
const toggleButtonDisabledClass = `${toggleButtonClass} cursor-not-allowed opacity-60`;

export const CollapsibleSection = ({
  title,
  subtitle,
  headerMeta,
  actions,
  errorBanner,
  className = '',
  disabled = false,
  children,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(true);
  const panelId = useId();

  return (
    <section className={`${sectionClass} ${className}`.trim()}>
      <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          disabled={disabled}
          className={disabled ? toggleButtonDisabledClass : toggleButtonEnabledClass}
        >
          <ChevronDown
            size={16}
            className={`shrink-0 text-zinc-400 transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
            {subtitle}
          </div>
        </button>
        {headerMeta ? (
          <div className="flex min-w-0 flex-1 justify-center text-sm">{headerMeta}</div>
        ) : null}
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {open && errorBanner}
      {open ? (
        <div id={panelId}>{children}</div>
      ) : null}
    </section>
  );
};
