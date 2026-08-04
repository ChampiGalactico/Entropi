import { getDb } from "../connection";
import type { Task, TaskStatus } from "../../types";

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
    `INSERT INTO tasks (subject_id, task_type_id, title, description, due_date, due_time, priority, status, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
    [
      values.subject_id,
      values.task_type_id,
      values.title,
      values.description,
      values.due_date,
      values.due_time,
      values.priority,
      values.status,
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
      completed_at = CASE WHEN $8 = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
     WHERE id = $9`,
    [
      values.subject_id,
      values.task_type_id,
      values.title,
      values.description,
      values.due_date,
      values.due_time,
      values.priority,
      values.status,
      id,
    ],
  );
}

export async function setTaskStatus(id: number, status: TaskStatus): Promise<void> {
  const db = await getDb();
  const completedAt = status === "completed" ? new Date().toISOString() : null;
  await db.execute("UPDATE tasks SET status = $1, completed_at = $2 WHERE id = $3", [
    status,
    completedAt,
    id,
  ]);
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
}
