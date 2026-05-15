import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';

interface AddSoftwareFormProps {
  isAdding: boolean;
  onAdd: (name: string) => Promise<void>;
}

export const AddSoftwareForm = ({ isAdding, onAdd }: AddSoftwareFormProps) => {
  const [name, setName] = useState('Node.js');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onAdd(name);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 border-b border-zinc-800 bg-zinc-950 px-6 py-5"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">Software name</span>
        <input
          className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Node.js"
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
