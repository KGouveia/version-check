import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  errorBanner?: ReactNode;
  className?: string;
  children: ReactNode;
}

const sectionClass =
  'overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950 shadow-xl shadow-black/30';

const toggleButtonClass =
  'inline-flex min-w-0 items-center gap-2 rounded-md text-left transition hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500';

export const CollapsibleSection = ({
  title,
  subtitle,
  actions,
  errorBanner,
  className = '',
  children,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(true);
  const panelId = useId();

  return (
    <section className={`${sectionClass} ${className}`.trim()}>
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className={toggleButtonClass}
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
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {open && errorBanner}
      {open ? (
        <div id={panelId}>{children}</div>
      ) : null}
    </section>
  );
};
