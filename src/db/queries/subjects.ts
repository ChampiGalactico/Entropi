import { getDb } from "../connection";
import type { ClassSession, Subject } from "../../types";

export async function listAllSubjects(): Promise<Subject[]> {
  const db = await getDb();
  return db.select<Subject[]>(
    `SELECT s.*, COALESCE(p.name, s.professor) AS professor
     FROM subjects s LEFT JOIN professors p ON p.id = s.professor_id
     ORDER BY s.name COLLATE NOCASE ASC`,
  );
}

export async function listSubjectsBySemester(semesterId: number): Promise<Subject[]> {
  const db = await getDb();
  return db.select<Subject[]>(
    `SELECT s.*, COALESCE(p.name, s.professor) AS professor
     FROM subjects s LEFT JOIN professors p ON p.id = s.professor_id
     WHERE s.semester_id = $1 ORDER BY s.name ASC`,
    [semesterId],
  );
}

export async function getSubject(id: number): Promise<Subject | null> {
  const db = await getDb();
  const rows = await db.select<Subject[]>(
    `SELECT s.*, COALESCE(p.name, s.professor) AS professor
     FROM subjects s LEFT JOIN professors p ON p.id = s.professor_id WHERE s.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createSubject(values: Omit<Subject, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO subjects
      (semester_id, name, code, professor, professor_id, color, start_date, end_date, is_gradable, credits, scale_max_override, min_passing_override, notes_content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      values.semester_id,
      values.name,
      values.code,
      values.professor,
      values.professor_id,
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
      semester_id = $1, name = $2, code = $3, professor = $4, professor_id = $5, color = $6,
      start_date = $7, end_date = $8, is_gradable = $9, credits = $10,
      scale_max_override = $11, min_passing_override = $12, notes_content = $13
     WHERE id = $14`,
    [
      values.semester_id,
      values.name,
      values.code,
      values.professor,
      values.professor_id,
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

export async function listAllClassSessions(): Promise<ClassSession[]> {
  const db = await getDb();
  return db.select<ClassSession[]>("SELECT * FROM class_sessions ORDER BY day_of_week ASC, start_time ASC");
}

export async function createClassSession(values: Omit<ClassSession, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO class_sessions (subject_id, session_type_id, day_of_week, start_time, end_time, location_id, professor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      values.subject_id,
      values.session_type_id,
      values.day_of_week,
      values.start_time,
      values.end_time,
      values.location_id,
      values.professor_id,
    ],
  );
  return result.lastInsertId as number;
}

export async function updateClassSession(id: number, values: Omit<ClassSession, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE class_sessions SET
      subject_id = $1, session_type_id = $2, day_of_week = $3, start_time = $4, end_time = $5, location_id = $6, professor_id = $7
     WHERE id = $8`,
    [
      values.subject_id,
      values.session_type_id,
      values.day_of_week,
      values.start_time,
      values.end_time,
      values.location_id,
      values.professor_id,
      id,
    ],
  );
}

export async function deleteClassSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM class_sessions WHERE id = $1", [id]);
}
