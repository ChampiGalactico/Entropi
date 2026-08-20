import { getDb } from "../connection";
import type { NoteFolder } from "../../types";

export async function listNoteFolders(): Promise<NoteFolder[]> {
  const db = await getDb();
  return db.select<NoteFolder[]>("SELECT * FROM note_folders ORDER BY name COLLATE NOCASE");
}

export async function getSubjectNoteFolderId(subjectId: number): Promise<number | null> {
  const db = await getDb();
  const rows = await db.select<Array<{ id: number }>>(
    `SELECT source_id AS id FROM entity_relations
     WHERE source_type = 'note_folder' AND target_type = 'subject' AND target_id = $1
       AND relation_kind = 'context_of' AND origin = 'system'
     LIMIT 1`,
    [subjectId],
  );
  return rows[0]?.id ?? null;
}

export async function createNoteFolder(name: string, color: string, parentId: number | null): Promise<number> {
  const db = await getDb();
  const result = await db.execute("INSERT INTO note_folders (name, color, parent_id) VALUES ($1, $2, $3)", [name, color, parentId]);
  return result.lastInsertId as number;
}

export async function updateNoteFolder(id: number, name: string, color: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE note_folders SET name = $1, color = $2 WHERE id = $3", [name, color, id]);
}

// Deletes a folder and every folder nested inside it, unfiling (not deleting) any notes they
// contained. Written as explicit recursive queries rather than relying on the migration's
// ON DELETE CASCADE/SET NULL clauses, since those only fire if the SQLite connection has
// `PRAGMA foreign_keys = ON` — not guaranteed here — and a silent no-op would leave orphaned
// subfolders invisible in the tree (parented to an id that no longer exists) instead of gone.
export async function deleteNoteFolder(id: number): Promise<void> {
  const db = await getDb();
  const descendantsCte = `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM note_folders WHERE id = $1
       UNION ALL
       SELECT nf.id FROM note_folders nf JOIN descendants d ON nf.parent_id = d.id
     )`;
  await db.execute(`${descendantsCte} UPDATE notes SET folder_id = NULL WHERE folder_id IN (SELECT id FROM descendants)`, [id]);
  await db.execute(`${descendantsCte} DELETE FROM note_folders WHERE id IN (SELECT id FROM descendants)`, [id]);
}
