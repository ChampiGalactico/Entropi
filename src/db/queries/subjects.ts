import { getDb } from "../connection";
import type { ClassSession, Subject } from "../../types";

export async function listSubjectsBySemester(semesterId: number): Promise<Subject[]> {
  const db = await getDb();
  return db.select<Subject[]>(
    "SELECT * FROM subjects WHERE semester_id = $1 ORDER BY name ASC",
    [semesterId],
  );
}

export async function getSubject(id: number): Promise<Subject | null> {
  const db = await getDb();
  const rows = await db.select<Subject[]>("SELECT * FROM subjects WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createSubject(values: Omit<Subject, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO subjects
      (semester_id, name, code, professor, color, start_date, end_date, is_gradable, credits, scale_max_override, min_passing_override, notes_content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      values.semester_id,
      values.name,
      values.code,
      values.professor,
      values.color,
      values.start_date,
      values.end_date,
      values.is_gradable,
      values.credits,
      values.scale_max_override,
      values.min_passing_override,
      values.notes_content,
    ],
  );
  return result.lastInsertId as number;
}

export async function updateSubject(id: number, values: Omit<Subject, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE subjects SET
      semester_id = $1, name = $2, code = $3, professor = $4, color = $5,
      start_date = $6, end_date = $7, is_gradable = $8, credits = $9,
      scale_max_override = $10, min_passing_override = $11, notes_content = $12
     WHERE id = $13`,
    [
      values.semester_id,
      values.name,
      values.code,
      values.professor,
      values.color,
      values.start_date,
      values.end_date,
      values.is_gradable,
      values.credits,
      values.scale_max_override,
      values.min_passing_override,
      values.notes_content,
      id,
    ],
  );
}

export async function deleteSubject(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM subjects WHERE id = $1", [id]);
}

export async function listClassSessions(subjectId: number): Promise<ClassSession[]> {
  const db = await getDb();
  return db.select<ClassSession[]>(
    "SELECT * FROM class_sessions WHERE subject_id = $1 ORDER BY day_of_week ASC, start_time ASC",
    [subjectId],
  );
}

export async function createClassSession(values: Omit<ClassSession, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO class_sessions (subject_id, session_type_id, day_of_week, start_time, end_time, location_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      values.subject_id,
      values.session_type_id,
      values.day_of_week,
      values.start_time,
      values.end_time,
      values.location_id,
    ],
  );
  return result.lastInsertId as number;
}

export async function updateClassSession(id: number, values: Omit<ClassSession, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE class_sessions SET
      subject_id = $1, session_type_id = $2, day_of_week = $3, start_time = $4, end_time = $5, location_id = $6
     WHERE id = $7`,
    [
      values.subject_id,
      values.session_type_id,
      values.day_of_week,
      values.start_time,
      values.end_time,
      values.location_id,
      id,
    ],
  );
}

export async function deleteClassSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM class_sessions WHERE id = $1", [id]);
}
