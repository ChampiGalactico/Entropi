import { getDb } from "../connection";
import type { LinkedEntityType, Note } from "../../types";

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>("SELECT * FROM notes ORDER BY updated_at DESC");
}

export async function listNotesForEntity(
  entityType: LinkedEntityType,
  entityId: number,
): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    "SELECT * FROM notes WHERE linked_entity_type = $1 AND linked_entity_id = $2 ORDER BY updated_at DESC",
    [entityType, entityId],
  );
}

export async function getNote(id: number): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createNote(
  values: Omit<Note, "id" | "created_at" | "updated_at">,
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.execute(
    `INSERT INTO notes (title, content, linked_entity_type, linked_entity_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)`,
    [values.title, values.content, values.linked_entity_type, values.linked_entity_id, now],
  );
  return result.lastInsertId as number;
}

export async function updateNote(
  id: number,
  values: Omit<Note, "id" | "created_at" | "updated_at">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE notes SET title = $1, content = $2, linked_entity_type = $3, linked_entity_id = $4, updated_at = $5
     WHERE id = $6`,
    [
      values.title,
      values.content,
      values.linked_entity_type,
      values.linked_entity_id,
      new Date().toISOString(),
      id,
    ],
  );
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
}
