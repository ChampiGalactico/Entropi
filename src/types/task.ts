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
  /** JSON-encoded TaskRecurrence (see lib/taskRecurrence.ts), or null if the task does not repeat. */
  recurrence_rule: string | null;
  recurrence_parent_id: number | null;
}
