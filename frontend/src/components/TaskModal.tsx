import { useState, useEffect } from 'react';
import { Task, Member, Priority } from '@/types';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  task: Task | null;
  columnId: number | null;
  members: Member[];
  projectId: number;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export default function TaskModal({ task, columnId, members, onClose }: Props) {
  const { addTask, updateTask, deleteTask } = useBoardStore();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? '');
  const [assigneeId, setAssigneeId] = useState<number | null>(task?.assignee_id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isEdit = Boolean(task);

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true); setError('');
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        priority, due_date: dueDate || null, assignee_id: assigneeId,
      };
      if (isEdit && task) await updateTask(task.id, data);
      else if (columnId) await addTask(columnId, data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setSaving(true);
    try {
      await deleteTask(task.id, task.column_id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl p-6 w-full max-w-md"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{isEdit ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-faint)' }}>✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Title</label>
            <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Task title" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Add more detail..." rows={3}
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>Assignee</label>
            <select value={assigneeId ?? ''} onChange={e => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={inputStyle}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="mt-3 text-red-400 text-xs font-mono">{error}</div>}

        <div className="flex gap-2 mt-6">
          {isEdit && (
            <button onClick={handleDelete} disabled={saving}
              className="border border-red-900 text-red-500 hover:bg-red-950 text-sm px-4 py-2 rounded-lg transition-colors">
              delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              cancel
            </button>
            <button onClick={handleSave} disabled={saving || !title.trim()}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'saving...' : isEdit ? 'save changes' : 'create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
