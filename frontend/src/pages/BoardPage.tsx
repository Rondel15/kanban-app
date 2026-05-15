import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { useAuthStore } from '@/store/useAuthStore';
import { useBoardStore } from '@/store/useBoardStore';
import { api } from '@/api/client';
import { ProjectDetail, Task } from '@/types';
import Column from '@/components/Column';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import ThemeToggle from '@/components/ThemeToggle';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { columns, loading, fetchBoard, addColumn, moveTask, moveTaskOptimistic } = useBoardStore();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<number | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    fetchBoard(projectId);
    api.get<ProjectDetail>(`/projects/${projectId}`)
      .then(setProject)
      .catch(() => navigate('/'));
  }, [projectId, fetchBoard, navigate]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type === 'task') setActiveTask(active.data.current.task);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !active.data.current?.task) return;
    const task: Task = active.data.current.task;
    const fromColId = task.column_id;
    let toColId: number;
    if (over.data.current?.type === 'column') toColId = over.data.current.columnId;
    else if (over.data.current?.type === 'task') toColId = over.data.current.task.column_id;
    else return;
    if (fromColId !== toColId) {
      const toCol = columns.find(c => c.id === toColId);
      moveTaskOptimistic(task.id, fromColId, toColId, toCol ? toCol.tasks.length : 0);
    }
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over || !active.data.current?.task) return;
    const task: Task = active.data.current.task;
    let toColId: number; let newPos: number;
    if (over.data.current?.type === 'column') {
      toColId = over.data.current.columnId;
      const col = columns.find(c => c.id === toColId);
      newPos = col ? col.tasks.length : 0;
    } else if (over.data.current?.type === 'task') {
      toColId = over.data.current.task.column_id;
      const col = columns.find(c => c.id === toColId);
      newPos = col ? col.tasks.findIndex(t => t.id === over.data.current!.task.id) : 0;
    } else return;
    moveTask(task.id, toColId, newPos);
  }

  const handleAddColumn = useCallback(async () => {
    if (!newColumnTitle.trim()) return;
    await addColumn(projectId, newColumnTitle.trim());
    setNewColumnTitle(''); setShowAddColumn(false);
  }, [addColumn, projectId, newColumnTitle]);

  async function inviteMember() {
    if (!inviteUsername.trim() || !project) return;
    setInviteError('');
    try {
      const member = await api.post<{ id: number; username: string; role: string }>(
        `/projects/${projectId}/members`, { username: inviteUsername.trim() }
      );
      setProject(p => p ? { ...p, members: [...p.members, member as any] } : p);
      setInviteUsername('');
    } catch (err) { setInviteError((err as Error).message); }
  }

  async function removeMember(userId: number) {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      setProject(p => p ? { ...p, members: p.members.filter(m => m.id !== userId) } : p);
    } catch (err) { console.error(err); }
  }

  const isOwner = project?.owner_id === user?.id;
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex-shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(`/projects/${projectId}`)} className="text-sm transition-colors" style={{ color: 'var(--text-faint)' }}>
            ← dashboard
          </button>
          <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
          <h1 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{project?.name ?? '...'}</h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex -space-x-1">
              {project?.members.slice(0, 5).map(m => (
                <div key={m.id} title={m.username}
                  className="w-6 h-6 rounded-full bg-brand-400/20 flex items-center justify-center text-[9px] text-brand-400 font-semibold"
                  style={{ border: '2px solid var(--surface)' }}>
                  {m.username[0].toUpperCase()}
                </div>
              ))}
            </div>
            <button onClick={() => setShowMembers(true)}
              className="text-xs px-2.5 py-1 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              members
            </button>
            <ThemeToggle />
            <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{user?.username}</span>
            <button onClick={logout} className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>sign out</button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center font-mono text-sm" style={{ color: 'var(--text-faint)' }}>
          loading board...
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-6 h-full">
              {columns.map(col => (
                <Column key={col.id} column={col} projectId={projectId}
                  onEditTask={setEditingTask} onAddTask={setAddingToColumn} />
              ))}

              {/* Add column */}
              <div className="flex-shrink-0 w-72">
                {showAddColumn ? (
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <input autoFocus type="text" value={newColumnTitle}
                      onChange={e => setNewColumnTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setShowAddColumn(false); }}
                      placeholder="Column title"
                      className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none mb-2" style={inputStyle} />
                    <div className="flex gap-2">
                      <button onClick={handleAddColumn}
                        className="flex-1 bg-brand-400 hover:bg-brand-500 text-white text-xs py-1.5 rounded-lg transition-colors">add</button>
                      <button onClick={() => setShowAddColumn(false)}
                        className="flex-1 text-xs py-1.5 rounded-lg transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddColumn(true)}
                    className="w-full py-3 rounded-xl border border-dashed text-sm transition-colors font-mono"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
                    + add column
                  </button>
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeTask && <div className="rotate-2 opacity-90"><TaskCard task={activeTask} onEdit={() => {}} /></div>}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task modals */}
      {addingToColumn !== null && (
        <TaskModal task={null} columnId={addingToColumn} members={project?.members ?? []}
          projectId={projectId} onClose={() => setAddingToColumn(null)} />
      )}
      {editingTask && (
        <TaskModal task={editingTask} columnId={null} members={project?.members ?? []}
          projectId={projectId} onClose={() => setEditingTask(null)} />
      )}

      {/* Members panel */}
      {showMembers && project && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={e => e.target === e.currentTarget && setShowMembers(false)}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Members</h3>
              <button onClick={() => setShowMembers(false)} style={{ color: 'var(--text-faint)' }}>✕</button>
            </div>
            <div className="space-y-2 mb-4">
              {project.members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-400/20 flex items-center justify-center text-xs text-brand-400 font-semibold">
                      {m.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{m.username}</span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{m.role}</span>
                  </div>
                  {isOwner && m.id !== user?.id && (
                    <button onClick={() => removeMember(m.id)}
                      className="text-xs transition-colors hover:text-red-400" style={{ color: 'var(--text-faint)' }}>
                      remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isOwner && (
              <div>
                <div className="h-px mb-4" style={{ background: 'var(--border)' }} />
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>
                  Invite by username
                </label>
                <div className="flex gap-2">
                  <input type="text" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && inviteMember()}
                    placeholder="username" className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
                  <button onClick={inviteMember}
                    className="bg-brand-400 hover:bg-brand-500 text-white text-sm px-3 py-2 rounded-lg transition-colors">
                    invite
                  </button>
                </div>
                {inviteError && <p className="text-red-400 text-xs mt-2 font-mono">{inviteError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
