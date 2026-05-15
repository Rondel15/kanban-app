import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column as ColumnType, Task } from '@/types';
import TaskCard from './TaskCard';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  column: ColumnType;
  projectId: number;
  onEditTask: (task: Task) => void;
  onAddTask: (columnId: number) => void;
}

export default function Column({ column, onEditTask, onAddTask }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { deleteColumn } = useBoardStore();

  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { type: 'column', columnId: column.id },
  });

  const taskIds = column.tasks.map(t => `task-${t.id}`);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col group/col">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{column.title}</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded-full"
            style={{ color: 'var(--text-faint)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {column.tasks.length}
          </span>
        </div>
        <div className="opacity-0 group-hover/col:opacity-100 flex items-center gap-1 transition-opacity">
          {confirmDelete ? (
            <>
              <button onClick={() => deleteColumn(column.id)}
                className="text-[10px] text-red-400 hover:text-red-300 font-mono">confirm</button>
              <button onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-mono ml-1" style={{ color: 'var(--text-faint)' }}>cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>✕</button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-2 min-h-[120px] p-2 rounded-xl transition-colors"
        style={{
          background: isOver ? 'rgba(124,106,247,0.05)' : 'var(--surface-raised)',
          border: isOver ? '1px dashed rgba(124,106,247,0.3)' : '1px solid transparent',
        }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </SortableContext>

        <button
          onClick={() => onAddTask(column.id)}
          className="mt-1 py-2 rounded-lg text-xs border border-dashed transition-colors font-mono"
          style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.borderColor = 'var(--border-strong)';
            (e.target as HTMLElement).style.color = 'var(--text-muted)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.borderColor = 'var(--border)';
            (e.target as HTMLElement).style.color = 'var(--text-faint)';
          }}
        >
          + add task
        </button>
      </div>
    </div>
  );
}
