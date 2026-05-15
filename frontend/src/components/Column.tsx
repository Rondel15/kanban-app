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
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-200">{column.title}</span>
          <span className="text-xs text-gray-600 font-mono bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteColumn(column.id)}
                className="text-[10px] text-red-400 hover:text-red-300 font-mono"
              >
                confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-gray-600 hover:text-gray-400 font-mono"
              >
                cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-gray-700 hover:text-gray-500 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-[120px] p-2 rounded-xl transition-colors ${
          isOver ? 'bg-brand-400/5 border border-dashed border-brand-400/30' : 'bg-gray-900/40'
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </SortableContext>

        {/* Add task button */}
        <button
          onClick={() => onAddTask(column.id)}
          className="mt-1 py-2 rounded-lg border border-dashed border-gray-800 text-gray-700 text-xs hover:border-gray-600 hover:text-gray-500 transition-colors font-mono"
        >
          + add task
        </button>
      </div>
    </div>
  );
}
