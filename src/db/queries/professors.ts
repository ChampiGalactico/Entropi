import { getDb } from "../connection";
import type { Professor, SubjectStaffMember, SubjectStaffRole } from "../../types";

export async function listProfessors(): Promise<Professor[]> {
  const db = await getDb();
  return db.select<Professor[]>("SELECT * FROM professors ORDER BY name COLLATE NOCASE ASC");
}

export async function createProfessor(values: Omit<Professor, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO professors (name, email, phone, department, office, office_hours, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [values.name, values.email, values.phone, values.department, values.office, values.office_hours, values.notes],
  );
  return result.lastInsertId as number;
}

export async function updateProfessor(id: number, values: Omit<Professor, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE professors SET name = $1, email = $2, phone = $3, department = $4,
     office = $5, office_hours = $6, notes = $7 WHERE id = $8`,
    [values.name, values.email, values.phone, values.department, values.office, values.office_hours, values.notes, id],
  );
}

export async function deleteProfessor(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM professors WHERE id = $1", [id]);
}

export async function listSubjectStaff(subjectId: number): Promise<SubjectStaffMember[]> {
  const db = await getDb();
  return db.select<SubjectStaffMember[]>(
    `SELECT p.*, ss.role FROM subject_staff ss
     JOIN professors p ON p.id = ss.professor_id
     WHERE ss.subject_id = $1 ORDER BY ss.role, p.name COLLATE NOCASE`,
    [subjectId],
  );
}

export async function addSubjectStaff(subjectId: number, professorId: number, role: SubjectStaffRole): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO subject_staff (subject_id, professor_id, role) VALUES ($1, $2, $3)",
    [subjectId, professorId, role],
  );
}

export async function removeSubjectStaff(subjectId: number, professorId: number, role: SubjectStaffRole): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM subject_staff WHERE subject_id = $1 AND professor_id = $2 AND role = $3",
    [subjectId, professorId, role],
  );
}
