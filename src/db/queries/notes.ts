import { getDb } from "../connection";
import type { LinkedEntityType, Note, NoteLink } from "../../types";
import { replaceManualRelations } from "./entityRelations";

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
    `SELECT DISTINCT n.* FROM notes n JOIN entity_relations er
       ON (er.source_type = 'note' AND er.source_id = n.id AND er.target_type = $1 AND er.target_id = $2)
       OR (er.target_type = 'note' AND er.target_id = n.id AND er.source_type = $1 AND er.source_id = $2)
     WHERE er.relation_kind = 'related_to' ORDER BY n.updated_at DESC`,
    [entityType, entityId],
  );
}

export async function listNoteReferencesForEntityType(entityType: "task" | "assessment"): Promise<EntityNoteReference[]> {
  const db = await getDb();
  return db.select<EntityNoteReference[]>(
    `SELECT
       CASE WHEN er.source_type = $1 THEN er.source_id ELSE er.target_id END AS entity_id,
       n.id AS note_id,
       n.title
     FROM entity_relations er
     JOIN notes n ON n.id = CASE WHEN er.source_type = 'note' THEN er.source_id ELSE er.target_id END
     WHERE er.relation_kind = 'related_to'
       AND ((er.source_type = $1 AND er.target_type = 'note')
         OR (er.target_type = $1 AND er.source_type = 'note'))
     ORDER BY n.updated_at DESC`,
    [entityType],
  );
}

export async function listNotesForSubject(subjectId: number): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>(
    `WITH note_relations(note_id, entity_type, entity_id) AS (
       SELECT
         CASE WHEN source_type = 'note' THEN source_id ELSE target_id END,
         CASE WHEN source_type = 'note' THEN target_type ELSE source_type END,
         CASE WHEN source_type = 'note' THEN target_id ELSE source_id END
       FROM entity_relations
       WHERE relation_kind = 'related_to' AND (source_type = 'note' OR target_type = 'note')
     )
     SELECT DISTINCT n.* FROM notes n
     JOIN note_relations nr ON nr.note_id = n.id
     LEFT JOIN tasks t ON nr.entity_type = 'task' AND t.id = nr.entity_id
     LEFT JOIN assessments a ON nr.entity_type = 'assessment' AND a.id = nr.entity_id
     WHERE (nr.entity_type = 'subject' AND nr.entity_id = $1)
        OR t.subject_id = $1 OR a.subject_id = $1
     ORDER BY n.updated_at DESC`,
    [subjectId],
  );
}

export async function listNoteLinks(noteId: number): Promise<NoteLink[]> {
  const db = await getDb();
  return db.select<NoteLink[]>(
    `SELECT
       $1 AS note_id,
       CASE WHEN source_type = 'note' AND source_id = $1 THEN target_type ELSE source_type END AS entity_type,
       CASE WHEN source_type = 'note' AND source_id = $1 THEN target_id ELSE source_id END AS entity_id
     FROM entity_relations
     WHERE relation_kind = 'related_to' AND origin = 'manual'
       AND ((source_type = 'note' AND source_id = $1)
         OR (target_type = 'note' AND target_id = $1))
       AND (CASE WHEN source_type = 'note' AND source_id = $1 THEN target_type ELSE source_type END) <> 'note_folder'
     ORDER BY created_at ASC, id ASC`,
    [noteId],
  );
}

export async function replaceNoteLinks(noteId: number, links: Array<Omit<NoteLink, "note_id">>): Promise<void> {
  await replaceManualRelations(
    { type: "note", id: noteId },
    links.map((link) => ({ type: link.entity_type, id: link.entity_id })),
  );
}

export async function getNote(id: number): Promise<Note | null> {
  const db = await getDb();
  const rows = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createNote(
  values: Omit<Note, "id" | "created_at" | "updated_at" | "folder_id"> & { folder_id?: number | null },
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.execute(
    `INSERT INTO notes (title, content, linked_entity_type, linked_entity_id, folder_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [values.title, values.content, values.linked_entity_type, values.linked_entity_id, values.folder_id ?? null, now],
  );
  return result.lastInsertId as number;
}

export async function updateNote(
  id: number,
  values: Omit<Note, "id" | "created_at" | "updated_at" | "folder_id">,
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

export async function moveNoteToFolder(id: number, folderId: number | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE notes SET folder_id = $1 WHERE id = $2", [folderId, id]);
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
}
