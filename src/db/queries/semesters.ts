import { getDb } from "../connection";
import type { Semester } from "../../types";

export async function listSemesters(): Promise<Semester[]> {
  const db = await getDb();
  return db.select<Semester[]>("SELECT * FROM semesters ORDER BY start_date DESC");
}

export async function getSemester(id: number): Promise<Semester | null> {
  const db = await getDb();
  const rows = await db.select<Semester[]>("SELECT * FROM semesters WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createSemester(values: Omit<Semester, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO semesters (name, start_date, end_date) VALUES ($1, $2, $3)",
    [values.name, values.start_date, values.end_date],
  );
  return result.lastInsertId as number;
}

export async function updateSemester(id: number, values: Omit<Semester, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE semesters SET name = $1, start_date = $2, end_date = $3 WHERE id = $4",
    [values.name, values.start_date, values.end_date, id],
  );
}

export async function deleteSemester(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM semesters WHERE id = $1", [id]);
}
