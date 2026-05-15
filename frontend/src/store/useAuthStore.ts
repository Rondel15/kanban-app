import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { api } from '@/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (username, password) => {
        const data = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
        localStorage.setItem('kanban_token', data.token);
        set({ user: data.user, token: data.token });
      },

      register: async (username, password) => {
        const data = await api.post<{ token: string; user: User }>('/auth/register', { username, password });
        localStorage.setItem('kanban_token', data.token);
        set({ user: data.user, token: data.token });
      },

      logout: () => {
        localStorage.removeItem('kanban_token');
        set({ user: null, token: null });
      },
    }),
    { name: 'kanban_auth' }
  )
);
