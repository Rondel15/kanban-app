import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { format, isPast, parseISO } from 'date-fns';

const PRIORITY_STYLES = {
  low:    'bg-green-950 text-green-400 border-green-900',
  medium: 'bg-amber-950 text-amber-400 border-amber-900',
  high:   'bg-red-950 text-red-400 border-red-900',
};

const PRIORITY_STYLES_LIGHT = {
  low:    'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high:   'bg-red-50 text-red-700 border-red-200',
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
  const isLight = document.documentElement.classList.contains('light');
  const priorityStyle = isLight ? PRIORITY_STYLES_LIGHT[task.priority] : PRIORITY_STYLES[task.priority];

  return (
    <div
      ref={setNodeRef} style={{ ...style, background: 'var(--surface)', border: '1px solid var(--border)' }}
      {...attributes} {...listeners}
      onClick={() => onEdit(task)}
      className="rounded-xl p-3.5 cursor-pointer group transition-all select-none hover:border-[var(--border-strong)]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${priorityStyle}`}>
          {task.priority}
        </span>
        {task.assignee_username && (
          <div className="w-5 h-5 rounded-full bg-brand-400/20 flex items-center justify-center text-[9px] text-brand-400 font-semibold">
            {task.assignee_username[0].toUpperCase()}
          </div>
        )}
      </div>

      <p className="text-sm leading-snug mb-2" style={{ color: 'var(--text)' }}>{task.title}</p>

      {task.description && (
        <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-faint)' }}>{task.description}</p>
      )}

      {task.due_date && (
        <div className={`text-[10px] font-mono mt-1 ${isOverdue ? 'text-red-400' : ''}`}
          style={!isOverdue ? { color: 'var(--text-faint)' } : {}}>
          {isOverdue ? '⚠ overdue · ' : ''}
          {format(parseISO(task.due_date), 'MMM d')}
        </div>
      )}
    </div>
  );
}
