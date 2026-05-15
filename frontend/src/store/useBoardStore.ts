import { create } from 'zustand';
import { Column, Task } from '@/types';
import { api } from '@/api/client';

interface BoardState {
  columns: Column[];
  loading: boolean;
  error: string | null;
  fetchBoard: (projectId: number) => Promise<void>;
  addColumn: (projectId: number, title: string) => Promise<void>;
  deleteColumn: (columnId: number) => Promise<void>;
  addTask: (columnId: number, data: Partial<Task>) => Promise<void>;
  updateTask: (taskId: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: number, columnId: number) => Promise<void>;
  moveTask: (taskId: number, toColumnId: number, newPosition: number) => Promise<void>;
  // Optimistic UI — update local state immediately on drag
  moveTaskOptimistic: (taskId: number, fromColumnId: number, toColumnId: number, newPosition: number) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  columns: [],
  loading: false,
  error: null,

  fetchBoard: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const columns = await api.get<Column[]>(`/projects/${projectId}/columns`);
      set({ columns, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addColumn: async (projectId, title) => {
    const col = await api.post<Column>(`/projects/${projectId}/columns`, { title });
    set(s => ({ columns: [...s.columns, col] }));
  },

  deleteColumn: async (columnId) => {
    await api.delete(`/columns/${columnId}`);
    set(s => ({ columns: s.columns.filter(c => c.id !== columnId) }));
  },

  addTask: async (columnId, data) => {
    const task = await api.post<Task>('/tasks', { column_id: columnId, ...data });
    set(s => ({
      columns: s.columns.map(c =>
        c.id === columnId ? { ...c, tasks: [...c.tasks, task] } : c
      ),
    }));
  },

  updateTask: async (taskId, data) => {
    const updated = await api.patch<Task>(`/tasks/${taskId}`, data);
    set(s => ({
      columns: s.columns.map(c => ({
        ...c,
        tasks: c.tasks.map(t => t.id === taskId ? updated : t),
      })),
    }));
  },

  deleteTask: async (taskId, columnId) => {
    await api.delete(`/tasks/${taskId}`);
    set(s => ({
      columns: s.columns.map(c =>
        c.id === columnId
          ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) }
          : c
      ),
    }));
  },

  moveTaskOptimistic: (taskId, fromColumnId, toColumnId, newPosition) => {
    const { columns } = get();
    const fromCol = columns.find(c => c.id === fromColumnId);
    const task = fromCol?.tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, column_id: toColumnId, position: newPosition };

    set({
      columns: columns.map(c => {
        if (c.id === fromColumnId) {
          return { ...c, tasks: c.tasks.filter(t => t.id !== taskId) };
        }
        if (c.id === toColumnId) {
          const newTasks = [...c.tasks];
          newTasks.splice(newPosition, 0, updatedTask);
          return { ...c, tasks: newTasks };
        }
        return c;
      }),
    });
  },

  moveTask: async (taskId, toColumnId, newPosition) => {
    await api.patch(`/tasks/${taskId}/move`, { column_id: toColumnId, position: newPosition });
  },
}));
