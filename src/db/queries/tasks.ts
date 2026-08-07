import { getDb } from "../connection";
import type { Task, TaskStatus } from "../../types";
import { computeNextDueDate, parseTaskRecurrence } from "../../lib/taskRecurrence";

export interface TaskFilters {
  subjectId?: number | null;
  taskTypeId?: number;
  status?: TaskStatus;
  priority?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.subjectId !== undefined) {
    if (filters.subjectId === null) {
      clauses.push("subject_id IS NULL");
    } else {
      params.push(filters.subjectId);
      clauses.push(`subject_id = $${params.length}`);
    }
  }
  if (filters.taskTypeId !== undefined) {
    params.push(filters.taskTypeId);
    clauses.push(`task_type_id = $${params.length}`);
  }
  if (filters.status !== undefined) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters.priority !== undefined) {
    params.push(filters.priority);
    clauses.push(`priority = $${params.length}`);
  }
  if (filters.dueDateFrom !== undefined) {
    params.push(filters.dueDateFrom);
    clauses.push(`due_date >= $${params.length}`);
  }
  if (filters.dueDateTo !== undefined) {
    params.push(filters.dueDateTo);
    clauses.push(`due_date <= $${params.length}`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.select<Task[]>(
    `SELECT * FROM tasks ${where} ORDER BY due_date IS NULL, due_date ASC, priority ASC`,
    params,
  );
}

export async function getTask(id: number): Promise<Task | null> {
  const db = await getDb();
  const rows = await db.select<Task[]>("SELECT * FROM tasks WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createTask(
  values: Omit<Task, "id" | "created_at" | "completed_at">,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO tasks (subject_id, task_type_id, title, description, due_date, due_time, priority, status, completed_at, recurrence_rule, recurrence_parent_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END, $9, $10)`,
    [
      values.subject_id,
      values.task_type_id,
      values.title,
      values.description,
      values.due_date,
      values.due_time,
      values.priority,
      values.status,
      values.recurrence_rule,
      values.recurrence_parent_id,
    ],
  );
  return result.lastInsertId as number;
}

export async function updateTask(
  id: number,
  values: Omit<Task, "id" | "created_at" | "completed_at">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE tasks SET
      subject_id = $1, task_type_id = $2, title = $3, description = $4,
      due_date = $5, due_time = $6, priority = $7, status = $8,
      completed_at = CASE WHEN $8 = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
      recurrence_rule = $9, recurrence_parent_id = $10
     WHERE id = $11`,
    [
      values.subject_id,
      values.task_type_id,
      values.title,
      values.description,
      values.due_date,
      values.due_time,
      values.priority,
      values.status,
      values.recurrence_rule,
      values.recurrence_parent_id,
      id,
    ],
  );
}

/** Marks the task complete/etc. and, for a recurring task being completed, spawns the next occurrence. */
export async function setTaskStatus(id: number, status: TaskStatus): Promise<void> {
  const db = await getDb();
  const completedAt = status === "completed" ? new Date().toISOString() : null;
  await db.execute("UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3", [
    status,
    completedAt,
    id,
  ]);

  if (status !== "completed") return;
  const task = await getTask(id);
  const rule = task ? parseTaskRecurrence(task.recurrence_rule) : null;
  if (!task || !rule || !task.due_date) return;

  const anchorTask = task.recurrence_parent_id ? await getTask(task.recurrence_parent_id) : task;
  const anchorDate = anchorTask?.due_date ?? task.due_date;
  const nextDate = computeNextDueDate(rule, task.due_date, anchorDate);
  if (!nextDate) return;

  await createTask({
    subject_id: task.subject_id,
    task_type_id: task.task_type_id,
    title: task.title,
    description: task.description,
    due_date: nextDate,
    due_time: task.due_time,
    priority: task.priority,
    status: "pending",
    recurrence_rule: task.recurrence_rule,
    recurrence_parent_id: task.recurrence_parent_id ?? task.id,
  });
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
}
