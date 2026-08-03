import { getDb } from "../connection";
import type { Assessment } from "../../types";

export async function listAssessmentsBySubject(subjectId: number): Promise<Assessment[]> {
  const db = await getDb();
  return db.select<Assessment[]>(
    "SELECT * FROM assessments WHERE subject_id = $1 ORDER BY date ASC",
    [subjectId],
  );
}

export async function listAssessmentsInRange(startDate: string, endDate: string): Promise<Assessment[]> {
  const db = await getDb();
  return db.select<Assessment[]>(
    "SELECT * FROM assessments WHERE date BETWEEN $1 AND $2 ORDER BY date ASC",
    [startDate, endDate],
  );
}

export async function getAssessment(id: number): Promise<Assessment | null> {
  const db = await getDb();
  const rows = await db.select<Assessment[]>("SELECT * FROM assessments WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createAssessment(values: Omit<Assessment, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO assessments
      (subject_id, assessment_type_id, title, date, start_time, end_time, location_id, notes_content, status, grade)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      values.subject_id,
      values.assessment_type_id,
      values.title,
      values.date,
      values.start_time,
      values.end_time,
      values.location_id,
      values.notes_content,
      values.status,
      values.grade,
    ],
  );
  return result.lastInsertId as number;
}

export async function updateAssessment(id: number, values: Omit<Assessment, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE assessments SET
      subject_id = $1, assessment_type_id = $2, title = $3, date = $4, start_time = $5,
      end_time = $6, location_id = $7, notes_content = $8, status = $9, grade = $10
     WHERE id = $11`,
    [
      values.subject_id,
      values.assessment_type_id,
      values.title,
      values.date,
      values.start_time,
      values.end_time,
      values.location_id,
      values.notes_content,
      values.status,
      values.grade,
      id,
    ],
  );
}

export async function deleteAssessment(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM assessments WHERE id = $1", [id]);
}
