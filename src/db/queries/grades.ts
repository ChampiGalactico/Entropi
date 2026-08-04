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
    `INSERT INTO grade_components (subject_id, parent_id, name, weight, sort_order)
     VALUES ($1, $2, $3, $4, $5)`,
    [values.subject_id, values.parent_id, values.name, values.weight, values.sort_order],
  );
  return result.lastInsertId as number;
}

export async function updateGradeComponent(
  id: number,
  values: Omit<GradeComponent, "id">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE grade_components SET subject_id = $1, parent_id = $2, name = $3, weight = $4, sort_order = $5
     WHERE id = $6`,
    [values.subject_id, values.parent_id, values.name, values.weight, values.sort_order, id],
  );
}

export async function deleteGradeComponent(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM grade_components WHERE id = $1", [id]);
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
    `INSERT INTO grade_entries (grade_component_id, grade, date, assessment_id, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [values.grade_component_id, values.grade, values.date, values.assessment_id, values.notes],
  );
  return result.lastInsertId as number;
}

export async function updateGradeEntry(id: number, values: Omit<GradeEntry, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE grade_entries SET grade_component_id = $1, grade = $2, date = $3, assessment_id = $4, notes = $5
     WHERE id = $6`,
    [values.grade_component_id, values.grade, values.date, values.assessment_id, values.notes, id],
  );
}

export async function deleteGradeEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM grade_entries WHERE id = $1", [id]);
}
