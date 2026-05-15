import { useState, useEffect } from 'react';
import { Task, Member, Priority } from '@/types';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  task: Task | null;          // null = create mode
  columnId: number | null;    // used in create mode
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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isEdit = Boolean(task);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        assignee_id: assigneeId,
      };

      if (isEdit && task) {
        await updateTask(task.id, data);
      } else if (columnId) {
        await addTask(columnId, data);
      }
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
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">{isEdit ? 'Edit task' : 'New task'}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-lg">✕</button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more detail..."
              rows={3}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 resize-none"
            />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Assignee</label>
            <select
              value={assigneeId ?? ''}
              onChange={e => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-400"
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.username}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-red-400 text-xs font-mono">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="border border-red-900 text-red-500 hover:bg-red-950 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="border border-gray-800 text-gray-400 text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="bg-brand-400 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'saving...' : isEdit ? 'save changes' : 'create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
