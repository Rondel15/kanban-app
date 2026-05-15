export type Priority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  username: string;
}

export interface Member extends User {
  role: 'owner' | 'member';
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  owner_username: string;
  member_count: number;
  created_at: string;
}

export interface ProjectDetail extends Project {
  members: Member[];
}

export interface Task {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  due_date: string | null;
  assignee_id: number | null;
  assignee_username: string | null;
  position: number;
  created_at: string;
}

export interface Column {
  id: number;
  project_id: number;
  title: string;
  position: number;
  tasks: Task[];
}
