import type { TaskStatus } from "./common";

export interface Task {
  id: number;
  subject_id: number | null;
  task_type_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: number;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
}
