import { getDb } from "../connection";
import type { Professor, SubjectStaffMember, TeachingRole } from "../../types";

export async function listTeachingRoles(): Promise<TeachingRole[]> {
  const db = await getDb();
  return db.select<TeachingRole[]>("SELECT * FROM teaching_roles ORDER BY name COLLATE NOCASE ASC");
}

export async function createTeachingRole(values: Omit<TeachingRole, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO teaching_roles (name, color, icon) VALUES ($1, $2, $3)",
    [values.name, values.color, values.icon],
  );
  return result.lastInsertId as number;
}

export async function updateTeachingRole(id: number, values: Omit<TeachingRole, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE teaching_roles SET name = $1, color = $2, icon = $3 WHERE id = $4",
    [values.name, values.color, values.icon, id],
  );
}

export async function deleteTeachingRole(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM teaching_roles WHERE id = $1", [id]);
}

export async function listProfessors(): Promise<Professor[]> {
  const db = await getDb();
  return db.select<Professor[]>("SELECT * FROM professors ORDER BY name COLLATE NOCASE ASC");
}

export async function getProfessor(id: number): Promise<Professor | null> {
  const db = await getDb();
  const rows = await db.select<Professor[]>("SELECT * FROM professors WHERE id = $1", [id]);
  return rows[0] ?? null;
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
    `SELECT p.*, ss.role_id, tr.name AS role_name, tr.color AS role_color, tr.icon AS role_icon
     FROM subject_staff ss
     JOIN professors p ON p.id = ss.professor_id
     JOIN teaching_roles tr ON tr.id = ss.role_id
     WHERE ss.subject_id = $1 ORDER BY tr.name COLLATE NOCASE, p.name COLLATE NOCASE`,
    [subjectId],
  );
}

export async function addSubjectStaff(subjectId: number, professorId: number, roleId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO subject_staff (subject_id, professor_id, role_id) VALUES ($1, $2, $3)",
    [subjectId, professorId, roleId],
  );
}

export async function removeSubjectStaff(subjectId: number, professorId: number, roleId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM subject_staff WHERE subject_id = $1 AND professor_id = $2 AND role_id = $3",
    [subjectId, professorId, roleId],
  );
}
