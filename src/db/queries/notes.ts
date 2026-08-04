import { getDb } from "../connection";
import type { LinkedEntityType, Note, NoteLink } from "../../types";

export interface EntityNoteReference { entity_id: number; note_id: number; title: string }

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
    `SELECT DISTINCT n.* FROM notes n JOIN note_links nl ON nl.note_id = n.id
     WHERE nl.entity_type = $1 AND nl.entity_id = $2 ORDER BY n.updated_at DESC`,
    [entityType, entityId],
  );
}

export async function listNoteReferencesForEntityType(entityType: "task" | "assessment"): Promise<EntityNoteReference[]> {
  const db = await getDb();
  return db.select<EntityNoteReference[]>(
    `SELECT nl.entity_id, n.id AS note_id, n.title
     FROM note_links nl JOIN notes n ON n.id = nl.note_id
     WHERE nl.entity_type = $1 ORDER BY n.updated_at DESC`,
    [entityType],
  );
}

export async function listNotesForSubject(subjectId: number): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    `SELECT DISTINCT n.* FROM notes n
     JOIN note_links nl ON nl.note_id = n.id
     LEFT JOIN tasks t ON nl.entity_type = 'task' AND t.id = nl.entity_id
     LEFT JOIN assessments a ON nl.entity_type = 'assessment' AND a.id = nl.entity_id
     WHERE (nl.entity_type = 'subject' AND nl.entity_id = $1)
        OR t.subject_id = $1 OR a.subject_id = $1
     ORDER BY n.updated_at DESC`,
    [subjectId],
  );
}

export async function listNoteLinks(noteId: number): Promise<NoteLink[]> {
  const db = await getDb();
  return db.select<NoteLink[]>("SELECT * FROM note_links WHERE note_id = $1", [noteId]);
}

export async function replaceNoteLinks(noteId: number, links: Array<Omit<NoteLink, "note_id">>): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM note_links WHERE note_id = $1", [noteId]);
  for (const link of links) {
    await db.execute(
      "INSERT OR IGNORE INTO note_links (note_id, entity_type, entity_id) VALUES ($1, $2, $3)",
      [noteId, link.entity_type, link.entity_id],
    );
  }
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
