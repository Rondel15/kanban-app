import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useAuthStore } from '@/store/useAuthStore';
import { useBoardStore } from '@/store/useBoardStore';
import { api } from '@/api/client';
import { ProjectDetail, Task } from '@/types';
import Column from '@/components/Column';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type === 'task') {
      setActiveTask(active.data.current.task);
    }
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !active.data.current?.task) return;

    const task: Task = active.data.current.task;
    const fromColId = task.column_id;

    let toColId: number;
    if (over.data.current?.type === 'column') {
      toColId = over.data.current.columnId;
    } else if (over.data.current?.type === 'task') {
      toColId = over.data.current.task.column_id;
    } else return;

    if (fromColId !== toColId) {
      const toCol = columns.find(c => c.id === toColId);
      const newPos = toCol ? toCol.tasks.length : 0;
      moveTaskOptimistic(task.id, fromColId, toColId, newPos);
    }
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null);
    if (!over || !active.data.current?.task) return;

    const task: Task = active.data.current.task;
    let toColId: number;
    let newPos: number;

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
    setNewColumnTitle('');
    setShowAddColumn(false);
  }, [addColumn, projectId, newColumnTitle]);

  async function inviteMember() {
    if (!inviteUsername.trim() || !project) return;
    setInviteError('');
    try {
      const member = await api.post<{ id: number; username: string; role: string }>(
        `/projects/${projectId}/members`,
        { username: inviteUsername.trim() }
      );
      setProject(p => p ? { ...p, members: [...p.members, member as any] } : p);
      setInviteUsername('');
    } catch (err) {
      setInviteError((err as Error).message);
    }
  }

  async function removeMember(userId: number) {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      setProject(p => p ? { ...p, members: p.members.filter(m => m.id !== userId) } : p);
    } catch (err) {
      console.error(err);
    }
  }

  const isOwner = project?.owner_id === user?.id;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← projects
          </button>
          <div className="h-4 w-px bg-gray-800" />
          <h1 className="font-semibold text-sm text-gray-200 truncate">{project?.name ?? '...'}</h1>

          <div className="ml-auto flex items-center gap-3">
            {/* Member avatars */}
            <div className="flex -space-x-1">
              {project?.members.slice(0, 5).map(m => (
                <div key={m.id} title={m.username}
                  className="w-6 h-6 rounded-full bg-brand-400/20 border border-gray-900 flex items-center justify-center text-[9px] text-brand-400 font-semibold">
                  {m.username[0].toUpperCase()}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowMembers(true)}
              className="text-xs text-gray-600 hover:text-gray-400 border border-gray-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              members
            </button>

            <span className="text-gray-600 text-sm">·</span>
            <span className="text-sm text-gray-500 font-mono">{user?.username}</span>
            <button onClick={logout} className="text-xs text-gray-700 hover:text-gray-500 transition-colors">
              sign out
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-sm">
          loading board...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-6 h-full group">
              {columns.map(col => (
                <Column
                  key={col.id}
                  column={col}
                  projectId={projectId}
                  onEditTask={setEditingTask}
                  onAddTask={colId => setAddingToColumn(colId)}
                />
              ))}

              {/* Add column */}
              <div className="flex-shrink-0 w-72">
                {showAddColumn ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <input
                      autoFocus
                      type="text"
                      value={newColumnTitle}
                      onChange={e => setNewColumnTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') setShowAddColumn(false);
                      }}
                      placeholder="Column title"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400 mb-2"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleAddColumn}
                        className="flex-1 bg-brand-400 hover:bg-brand-500 text-white text-xs py-1.5 rounded-lg transition-colors">
                        add
                      </button>
                      <button onClick={() => setShowAddColumn(false)}
                        className="flex-1 border border-gray-800 text-gray-500 text-xs py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                        cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddColumn(true)}
                    className="w-full py-3 rounded-xl border border-dashed border-gray-800 text-gray-700 text-sm hover:border-gray-600 hover:text-gray-500 transition-colors font-mono"
                  >
                    + add column
                  </button>
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} onEdit={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task modal — create */}
      {addingToColumn !== null && (
        <TaskModal
          task={null}
          columnId={addingToColumn}
          members={project?.members ?? []}
          projectId={projectId}
          onClose={() => setAddingToColumn(null)}
        />
      )}

      {/* Task modal — edit */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          columnId={null}
          members={project?.members ?? []}
          projectId={projectId}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Members panel */}
      {showMembers && project && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={e => e.target === e.currentTarget && setShowMembers(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Members</h3>
              <button onClick={() => setShowMembers(false)} className="text-gray-600 hover:text-gray-400">✕</button>
            </div>

            <div className="space-y-2 mb-4">
              {project.members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-400/20 flex items-center justify-center text-xs text-brand-400 font-semibold">
                      {m.username[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-200">{m.username}</span>
                    <span className="text-[10px] font-mono text-gray-600">{m.role}</span>
                  </div>
                  {isOwner && m.id !== user?.id && (
                    <button onClick={() => removeMember(m.id)}
                      className="text-gray-700 hover:text-red-400 text-xs transition-colors">
                      remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isOwner && (
              <div>
                <div className="h-px bg-gray-800 mb-4" />
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Invite by username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={e => setInviteUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && inviteMember()}
                    placeholder="username"
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-400"
                  />
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
