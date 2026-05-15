import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { SoftwareKind } from '../types';

interface AddSoftwareFormProps {
  isAdding: boolean;
  onAdd: (name: string, kind: SoftwareKind) => Promise<void>;
}

const defaultNameByKind: Record<SoftwareKind, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  java: 'OpenJDK',
};

const kindOptions: Array<{ value: SoftwareKind; label: string }> = [
  { value: 'nodejs', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'OpenJDK' },
];

export const AddSoftwareForm = ({ isAdding, onAdd }: AddSoftwareFormProps) => {
  const [kind, setKind] = useState<SoftwareKind>('nodejs');
  const [name, setName] = useState(defaultNameByKind.nodejs);

  useEffect(() => {
    setName(defaultNameByKind[kind]);
  }, [kind]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onAdd(name, kind);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 border-b border-zinc-800 bg-zinc-950 px-6 py-5"
    >
      <label className="flex min-w-[10rem] flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">Software kind</span>
        <select
          className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          value={kind}
          onChange={(event) => setKind(event.target.value as SoftwareKind)}
          disabled={isAdding}
          aria-label="Software kind"
        >
          {kindOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[12rem] flex-1 flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">Display name</span>
        <input
          className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={defaultNameByKind[kind]}
          disabled={isAdding}
        />
      </label>
      <button
        type="submit"
        disabled={isAdding}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={16} aria-hidden="true" />
        {isAdding ? 'Adding' : 'Add'}
      </button>
    </form>
  );
};
