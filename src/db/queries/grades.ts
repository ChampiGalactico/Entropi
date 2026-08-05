import { getDb } from "../connection";
import type { GradeComponent, GradeEntry } from "../../types";

export async function listGradeComponents(subjectId: number): Promise<GradeComponent[]> {
  const db = await getDb();
  return db.select<GradeComponent[]>(
    "SELECT * FROM grade_components WHERE subject_id = $1 ORDER BY parent_id IS NOT NULL, sort_order ASC",
    [subjectId],
  );
}

export async function createGradeComponent(
  values: Omit<GradeComponent, "id">,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO grade_components
       (subject_id, parent_id, name, weight, sort_order, is_group, grade, date, assessment_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [values.subject_id, values.parent_id, values.name, values.weight, values.sort_order, values.is_group, values.grade, values.date, values.assessment_id, values.notes],
  );
  return result.lastInsertId as number;
}

export async function updateGradeComponent(
  id: number,
  values: Omit<GradeComponent, "id">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE grade_components SET subject_id = $1, parent_id = $2, name = $3, weight = $4,
       sort_order = $5, is_group = $6, grade = $7, date = $8, assessment_id = $9, notes = $10
     WHERE id = $11`,
    [values.subject_id, values.parent_id, values.name, values.weight, values.sort_order, values.is_group, values.grade, values.date, values.assessment_id, values.notes, id],
  );
}

export async function deleteGradeComponent(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM grade_components WHERE id = $1", [id]);
}

export async function clearAssessmentGradeLinks(assessmentId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE grade_components SET assessment_id = NULL WHERE assessment_id = $1",
    [assessmentId],
  );
}

export async function listGradeEntries(gradeComponentId: number): Promise<GradeEntry[]> {
  const db = await getDb();
  return db.select<GradeEntry[]>(
    "SELECT * FROM grade_entries WHERE grade_component_id = $1 ORDER BY date ASC",
    [gradeComponentId],
  );
}

export async function listGradeEntriesForSubject(subjectId: number): Promise<GradeEntry[]> {
  const db = await getDb();
  return db.select<GradeEntry[]>(
    `SELECT ge.* FROM grade_entries ge
     JOIN grade_components gc ON gc.id = ge.grade_component_id
     WHERE gc.subject_id = $1 ORDER BY ge.date DESC, ge.id DESC`,
    [subjectId],
  );
}

export async function createGradeEntry(values: Omit<GradeEntry, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO grade_entries (grade_component_id, name, grade, weight, date, assessment_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [values.grade_component_id, values.name, values.grade, values.weight, values.date, values.assessment_id, values.notes],
  );
  return result.lastInsertId as number;
}

export async function updateGradeEntry(id: number, values: Omit<GradeEntry, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE grade_entries SET grade_component_id = $1, name = $2, grade = $3, weight = $4, date = $5, assessment_id = $6, notes = $7
     WHERE id = $8`,
    [values.grade_component_id, values.name, values.grade, values.weight, values.date, values.assessment_id, values.notes, id],
  );
}

export async function deleteGradeEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM grade_entries WHERE id = $1", [id]);
}
