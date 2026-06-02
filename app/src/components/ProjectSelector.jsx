import { useState } from 'preact/hooks';
import { createProject } from '../api.js';

export default function ProjectSelector({ projects, selectedId, isOwner, onChange, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      const proj = await createProject(name.trim());
      setName('');
      setCreating(false);
      onCreated(proj);
    } catch (err) {
      setError(err.message);
    }
  };

  if (projects.length === 0) return null;

  return (
    <div class="flex items-center gap-1">
      <select
        value={selectedId || ''}
        onChange={(e) => onChange(e.target.value)}
        class="bg-[#151311] border border-[#2a2520] text-xs text-[#efe9e1] px-2 py-1.5 outline-none"
      >
        {projects.map((p) => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
      </select>

      {creating ? (
        <form onSubmit={handleCreate} class="flex items-center gap-1">
          <input
            type="text"
            value={name}
            onInput={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Name"
            class="bg-[#151311] border border-[#2a2520] text-xs text-[#efe9e1] px-2 py-1.5 w-32 outline-none focus:border-[#f06543]"
            autofocus
          />
          <button type="submit" class="btn-primary text-[10px] py-1.5 px-2">Create</button>
          <button type="button" onClick={() => { setCreating(false); setName(''); setError(''); }} class="btn-ghost text-[10px] px-1">✕</button>
          {error && <span class="text-[10px] text-[#e5534b] ml-1">{error}</span>}
        </form>
      ) : (
        isOwner && (
          <button onClick={() => setCreating(true)} title="New project" class="btn-ghost text-[10px] px-1.5">+</button>
        )
      )}
    </div>
  );
}
