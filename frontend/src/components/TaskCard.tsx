import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { format, isPast, parseISO } from 'date-fns';

const PRIORITY_STYLES = {
  low:    'bg-green-950 text-green-400 border-green-900',
  medium: 'bg-amber-950 text-amber-400 border-amber-900',
  high:   'bg-red-950 text-red-400 border-red-900',
};

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
}

export default function TaskCard({ task, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue = task.due_date && isPast(parseISO(task.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(task)}
      className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 cursor-pointer group transition-all select-none"
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        {task.assignee_username && (
          <div className="w-5 h-5 rounded-full bg-brand-400/20 flex items-center justify-center text-[9px] text-brand-400 font-semibold">
            {task.assignee_username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-gray-200 leading-snug mb-2">{task.title}</p>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
      )}

      {/* Due date */}
      {task.due_date && (
        <div className={`text-[10px] font-mono mt-1 ${isOverdue ? 'text-red-400' : 'text-gray-600'}`}>
          {isOverdue ? '⚠ overdue · ' : ''}
          {format(parseISO(task.due_date), 'MMM d')}
        </div>
      )}
    </div>
  );
}
