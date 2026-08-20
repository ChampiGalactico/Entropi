import { getDb } from "../connection";
import type {
  BookmarkCollection,
  BookmarkCollectionInput,
  BookmarkDraft,
  BookmarkScopeOption,
  NoteBookmark,
} from "../../types";

const activeFoldersCte = `WITH RECURSIVE ancestors(id, depth) AS (
  SELECT folder_id, 0 FROM notes WHERE id = $1 AND folder_id IS NOT NULL
  UNION ALL
  SELECT nf.parent_id, a.depth + 1
  FROM note_folders nf JOIN ancestors a ON nf.id = a.id
  WHERE nf.parent_id IS NOT NULL
)`;

export async function listBookmarkCollectionsForNote(noteId: number): Promise<BookmarkCollection[]> {
  const db = await getDb();
  if (noteId <= 0) {
    return db.select<BookmarkCollection[]>(
      `SELECT bc.*, nf.name AS scope_folder_name, 0 AS scope_depth, COUNT(nb.id) AS bookmark_count
       FROM bookmark_collections bc
       LEFT JOIN note_folders nf ON nf.id = bc.scope_folder_id
       LEFT JOIN note_bookmarks nb ON nb.collection_id = bc.id
       GROUP BY bc.id
       ORDER BY CASE WHEN bc.scope_folder_id IS NULL THEN 0 ELSE 1 END, bc.name COLLATE NOCASE`,
    );
  }
  return db.select<BookmarkCollection[]>(
    `${activeFoldersCte}
     SELECT bc.*, nf.name AS scope_folder_name,
       CASE WHEN bc.scope_folder_id IS NULL THEN 1000000 ELSE a.depth END AS scope_depth,
       COUNT(nb.id) AS bookmark_count
     FROM bookmark_collections bc
     LEFT JOIN ancestors a ON a.id = bc.scope_folder_id
     LEFT JOIN note_folders nf ON nf.id = bc.scope_folder_id
     LEFT JOIN note_bookmarks nb ON nb.collection_id = bc.id
     WHERE bc.scope_folder_id IS NULL OR a.id IS NOT NULL
     GROUP BY bc.id
     ORDER BY scope_depth ASC, bc.name COLLATE NOCASE ASC`,
    [noteId],
  );
}

export async function listBookmarkScopeOptions(noteId: number): Promise<BookmarkScopeOption[]> {
  const db = await getDb();
  if (noteId <= 0) {
    const rows = await db.select<Array<{ folder_id: number; name: string; depth: number }>>(
      `WITH RECURSIVE paths(id, name, depth) AS (
         SELECT id, name, 0 FROM note_folders WHERE parent_id IS NULL
         UNION ALL
         SELECT nf.id, paths.name || ' › ' || nf.name, paths.depth + 1
         FROM note_folders nf JOIN paths ON nf.parent_id = paths.id
       )
       SELECT id AS folder_id, name, depth FROM paths ORDER BY name COLLATE NOCASE`,
    );
    return [{ folder_id: null, name: "Global", depth: 1000000 }, ...rows];
  }
  const rows = await db.select<Array<{ folder_id: number; name: string; depth: number }>>(
    `${activeFoldersCte}
     SELECT a.id AS folder_id, nf.name, a.depth
     FROM ancestors a JOIN note_folders nf ON nf.id = a.id
     ORDER BY a.depth ASC`,
    [noteId],
  );
  return [{ folder_id: null, name: "Global", depth: 1000000 }, ...rows];
}

export async function createBookmarkCollection(values: BookmarkCollectionInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO bookmark_collections (name, icon, color, scope_folder_id, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
    [values.name.trim(), values.icon?.trim() || null, values.color, values.scope_folder_id],
  );
  return result.lastInsertId as number;
}

export async function updateBookmarkCollection(id: number, values: BookmarkCollectionInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE bookmark_collections
     SET name = $1, icon = $2, color = $3, scope_folder_id = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [values.name.trim(), values.icon?.trim() || null, values.color, values.scope_folder_id, id],
  );
}

export async function deleteBookmarkCollection(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM bookmark_collections WHERE id = $1", [id]);
}

export async function listBookmarks(collectionId: number, query = ""): Promise<NoteBookmark[]> {
  const db = await getDb();
  return db.select<NoteBookmark[]>(
    `SELECT nb.*, n.title AS note_title, nf.name AS folder_name
     FROM note_bookmarks nb
     JOIN notes n ON n.id = nb.note_id
     LEFT JOIN note_folders nf ON nf.id = n.folder_id
     WHERE nb.collection_id = $1
       AND ($2 = '' OR nb.plain_text LIKE '%' || $2 || '%' OR n.title LIKE '%' || $2 || '%')
     ORDER BY nb.created_at DESC, nb.id DESC`,
    [collectionId, query.trim()],
  );
}

export async function saveBookmark(collectionId: number, draft: BookmarkDraft): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO note_bookmarks
      (collection_id, note_id, block_id, block_type, block_snapshot, plain_text)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(collection_id, note_id, block_id) DO UPDATE SET
       block_type = excluded.block_type,
       block_snapshot = excluded.block_snapshot,
       plain_text = excluded.plain_text,
       created_at = CURRENT_TIMESTAMP`,
    [collectionId, draft.noteId, draft.blockId, draft.blockType, draft.blockSnapshot, draft.plainText],
  );
  if (result.lastInsertId) return result.lastInsertId as number;
  const rows = await db.select<Array<{ id: number }>>(
    "SELECT id FROM note_bookmarks WHERE collection_id = $1 AND note_id = $2 AND block_id = $3",
    [collectionId, draft.noteId, draft.blockId],
  );
  return rows[0].id;
}

export async function deleteBookmark(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM note_bookmarks WHERE id = $1", [id]);
}
