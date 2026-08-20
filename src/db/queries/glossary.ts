import { getDb } from "../connection";
import { escapeGlossaryPattern, extractGlossaryTextBlocks, glossaryContextExcerpt, normalizeGlossaryTerm } from "../../lib/glossary";
import type {
  GlossaryAlias,
  GlossaryEntry,
  GlossaryEntryDetail,
  GlossaryEntryInput,
  GlossaryOccurrence,
  GlossaryScopeOption,
  GlossarySection,
} from "../../types";

interface GlossaryVocabularyRow {
  entry_id: number;
  value: string;
  normalized_value: string;
  scope_depth: number;
}

async function assertScopedVocabularyIsUnique(
  db: Awaited<ReturnType<typeof getDb>>,
  values: GlossaryEntryInput,
  excludedEntryId = -1,
): Promise<void> {
  const desired = new Set([values.term, ...values.aliases].map(normalizeGlossaryTerm).filter(Boolean));
  if (desired.size === 0) return;
  const existing = await db.select<Array<{ normalized_value: string }>>(
    `SELECT normalized_term AS normalized_value
     FROM glossary_entries
     WHERE COALESCE(scope_folder_id, 0) = COALESCE($1, 0) AND id <> $2
     UNION ALL
     SELECT ga.normalized_alias
     FROM glossary_aliases ga JOIN glossary_entries ge ON ge.id = ga.entry_id
     WHERE COALESCE(ge.scope_folder_id, 0) = COALESCE($1, 0) AND ge.id <> $2`,
    [values.scope_folder_id, excludedEntryId],
  );
  if (existing.some((row) => desired.has(row.normalized_value))) {
    throw new Error("duplicate-glossary-vocabulary");
  }
}

const activeEntriesCte = `WITH RECURSIVE ancestors(id, depth) AS (
  SELECT folder_id, 0 FROM notes WHERE id = $1 AND folder_id IS NOT NULL
  UNION ALL
  SELECT nf.parent_id, a.depth + 1
  FROM note_folders nf JOIN ancestors a ON nf.id = a.id
  WHERE nf.parent_id IS NOT NULL
)`;

export async function listGlossaryEntriesForNote(noteId: number, query = ""): Promise<GlossaryEntry[]> {
  const db = await getDb();
  if (noteId <= 0) {
    return db.select<GlossaryEntry[]>(
      `SELECT ge.*, nf.name AS scope_folder_name, 0 AS scope_depth
       FROM glossary_entries ge
       LEFT JOIN note_folders nf ON nf.id = ge.scope_folder_id
       WHERE $1 = '' OR ge.normalized_term LIKE '%' || $1 || '%'
         OR EXISTS (SELECT 1 FROM glossary_aliases ga WHERE ga.entry_id = ge.id AND ga.normalized_alias LIKE '%' || $1 || '%')
       ORDER BY CASE WHEN ge.scope_folder_id IS NULL THEN 0 ELSE 1 END, ge.term COLLATE NOCASE`,
      [normalizeGlossaryTerm(query)],
    );
  }
  return db.select<GlossaryEntry[]>(
    `${activeEntriesCte}
     SELECT ge.*, nf.name AS scope_folder_name,
       CASE WHEN ge.scope_folder_id IS NULL THEN 1000000 ELSE a.depth END AS scope_depth
     FROM glossary_entries ge
     LEFT JOIN ancestors a ON a.id = ge.scope_folder_id
     LEFT JOIN note_folders nf ON nf.id = ge.scope_folder_id
     WHERE (ge.scope_folder_id IS NULL OR a.id IS NOT NULL)
       AND ($2 = '' OR ge.normalized_term LIKE '%' || $2 || '%'
         OR EXISTS (SELECT 1 FROM glossary_aliases ga WHERE ga.entry_id = ge.id AND ga.normalized_alias LIKE '%' || $2 || '%'))
     ORDER BY scope_depth ASC, ge.term COLLATE NOCASE ASC`,
    [noteId, normalizeGlossaryTerm(query)],
  );
}

export async function listGlossaryScopeOptions(noteId: number): Promise<GlossaryScopeOption[]> {
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
    `${activeEntriesCte}
     SELECT a.id AS folder_id, nf.name, a.depth
     FROM ancestors a JOIN note_folders nf ON nf.id = a.id
     ORDER BY a.depth ASC`,
    [noteId],
  );
  return [{ folder_id: null, name: "Global", depth: 1000000 }, ...rows];
}

export async function getGlossaryEntryDetail(id: number): Promise<GlossaryEntryDetail | null> {
  const db = await getDb();
  const entries = await db.select<GlossaryEntry[]>(
    `SELECT ge.*, nf.name AS scope_folder_name, 0 AS scope_depth
     FROM glossary_entries ge LEFT JOIN note_folders nf ON nf.id = ge.scope_folder_id
     WHERE ge.id = $1`,
    [id],
  );
  const entry = entries[0];
  if (!entry) return null;
  const [aliases, sections] = await Promise.all([
    db.select<GlossaryAlias[]>("SELECT * FROM glossary_aliases WHERE entry_id = $1 ORDER BY alias COLLATE NOCASE", [id]),
    db.select<GlossarySection[]>("SELECT * FROM glossary_sections WHERE entry_id = $1 ORDER BY sort_order ASC, id ASC", [id]),
  ]);
  return { ...entry, aliases, sections };
}

async function replaceGlossaryChildren(entryId: number, values: GlossaryEntryInput): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM glossary_aliases WHERE entry_id = $1", [entryId]);
  const seen = new Set<string>();
  for (const alias of values.aliases) {
    const normalized = normalizeGlossaryTerm(alias);
    if (!normalized || normalized === normalizeGlossaryTerm(values.term) || seen.has(normalized)) continue;
    seen.add(normalized);
    await db.execute(
      "INSERT INTO glossary_aliases (entry_id, alias, normalized_alias) VALUES ($1, $2, $3)",
      [entryId, alias.trim(), normalized],
    );
  }
  await db.execute("DELETE FROM glossary_sections WHERE entry_id = $1", [entryId]);
  for (const [index, section] of values.sections.entries()) {
    if (!section.content.trim()) continue;
    await db.execute(
      `INSERT INTO glossary_sections (entry_id, section_type, title, content, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [entryId, section.section_type, section.title?.trim() || null, section.content.trim(), index],
    );
  }
}

export async function createGlossaryEntry(values: GlossaryEntryInput): Promise<number> {
  const db = await getDb();
  const normalized = normalizeGlossaryTerm(values.term);
  if (!normalized) throw new Error("empty-glossary-term");
  await assertScopedVocabularyIsUnique(db, values);
  const result = await db.execute(
    `INSERT INTO glossary_entries
      (term, normalized_term, definition, scope_folder_id, source_note_id, source_block_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
    [values.term.trim(), normalized, values.definition.trim(), values.scope_folder_id, values.source_note_id ?? null, values.source_block_id ?? null],
  );
  const id = result.lastInsertId as number;
  await replaceGlossaryChildren(id, values);
  await reindexGlossaryScope(values.scope_folder_id);
  return id;
}

export async function updateGlossaryEntry(id: number, values: GlossaryEntryInput): Promise<void> {
  const db = await getDb();
  const previous = await db.select<Array<{ scope_folder_id: number | null }>>("SELECT scope_folder_id FROM glossary_entries WHERE id = $1", [id]);
  const normalized = normalizeGlossaryTerm(values.term);
  if (!normalized) throw new Error("empty-glossary-term");
  await assertScopedVocabularyIsUnique(db, values, id);
  await db.execute(
    `UPDATE glossary_entries SET term = $1, normalized_term = $2, definition = $3,
       scope_folder_id = $4, source_note_id = $5, source_block_id = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [values.term.trim(), normalized, values.definition.trim(), values.scope_folder_id, values.source_note_id ?? null, values.source_block_id ?? null, id],
  );
  await replaceGlossaryChildren(id, values);
  await reindexGlossaryScope(previous[0]?.scope_folder_id ?? null);
  if (values.scope_folder_id !== (previous[0]?.scope_folder_id ?? null)) await reindexGlossaryScope(values.scope_folder_id);
}

export async function deleteGlossaryEntry(id: number): Promise<void> {
  const db = await getDb();
  const rows = await db.select<Array<{ scope_folder_id: number | null }>>("SELECT scope_folder_id FROM glossary_entries WHERE id = $1", [id]);
  await db.execute("DELETE FROM glossary_entries WHERE id = $1", [id]);
  await reindexGlossaryScope(rows[0]?.scope_folder_id ?? null);
}

export async function listGlossaryOccurrences(entryId: number): Promise<GlossaryOccurrence[]> {
  const db = await getDb();
  return db.select<GlossaryOccurrence[]>(
    `SELECT go.*, n.title AS note_title, nf.name AS folder_name
     FROM glossary_occurrences go
     JOIN notes n ON n.id = go.note_id
     LEFT JOIN note_folders nf ON nf.id = n.folder_id
     WHERE go.entry_id = $1
     ORDER BY n.updated_at DESC, go.block_id, go.start_offset`,
    [entryId],
  );
}

export async function listGlossaryVocabularyForNote(noteId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<Array<{ value: string }>>(
    `${activeEntriesCte}
     SELECT ge.term AS value FROM glossary_entries ge LEFT JOIN ancestors a ON a.id = ge.scope_folder_id
     WHERE ge.scope_folder_id IS NULL OR a.id IS NOT NULL
     UNION
     SELECT ga.alias AS value FROM glossary_aliases ga
     JOIN glossary_entries ge ON ge.id = ga.entry_id LEFT JOIN ancestors a ON a.id = ge.scope_folder_id
     WHERE ge.scope_folder_id IS NULL OR a.id IS NOT NULL`,
    [noteId],
  );
  return rows.map((row) => row.value);
}

async function activeVocabulary(noteId: number): Promise<GlossaryVocabularyRow[]> {
  const db = await getDb();
  return db.select<GlossaryVocabularyRow[]>(
    `${activeEntriesCte}
     SELECT ge.id AS entry_id, ge.term AS value, ge.normalized_term AS normalized_value,
       CASE WHEN ge.scope_folder_id IS NULL THEN 1000000 ELSE a.depth END AS scope_depth
     FROM glossary_entries ge LEFT JOIN ancestors a ON a.id = ge.scope_folder_id
     WHERE ge.scope_folder_id IS NULL OR a.id IS NOT NULL
     UNION ALL
     SELECT ge.id, ga.alias, ga.normalized_alias,
       CASE WHEN ge.scope_folder_id IS NULL THEN 1000000 ELSE a.depth END
     FROM glossary_aliases ga JOIN glossary_entries ge ON ge.id = ga.entry_id
     LEFT JOIN ancestors a ON a.id = ge.scope_folder_id
     WHERE ge.scope_folder_id IS NULL OR a.id IS NOT NULL
     ORDER BY scope_depth ASC`,
    [noteId],
  );
}

export async function reindexGlossaryNote(noteId: number): Promise<void> {
  const db = await getDb();
  const notes = await db.select<Array<{ content: string | null }>>("SELECT content FROM notes WHERE id = $1", [noteId]);
  await db.execute("DELETE FROM glossary_occurrences WHERE note_id = $1", [noteId]);
  const blocks = extractGlossaryTextBlocks(notes[0]?.content ?? null);
  if (blocks.length === 0) return;
  const vocabularyRows = await activeVocabulary(noteId);
  const vocabulary = new Map<string, GlossaryVocabularyRow>();
  for (const row of vocabularyRows) if (!vocabulary.has(row.normalized_value)) vocabulary.set(row.normalized_value, row);
  const terms = [...vocabulary.values()].sort((a, b) => b.value.length - a.value.length);

  for (const block of blocks) {
    const text = block.text.normalize("NFC");
    const claimed: Array<{ start: number; end: number }> = [];
    for (const term of terms) {
      const pattern = escapeGlossaryPattern(term.value.normalize("NFC"));
      if (!pattern) continue;
      const expression = new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, "giu");
      for (const match of text.matchAll(expression)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (claimed.some((range) => start < range.end && end > range.start)) continue;
        claimed.push({ start, end });
        await db.execute(
          `INSERT OR IGNORE INTO glossary_occurrences
            (entry_id, note_id, block_id, matched_text, start_offset, context_excerpt, indexed_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [term.entry_id, noteId, block.id, match[0], start, glossaryContextExcerpt(text, start, match[0].length)],
        );
      }
    }
  }
}

export async function reindexGlossaryScope(scopeFolderId: number | null): Promise<void> {
  const db = await getDb();
  const notes = scopeFolderId === null
    ? await db.select<Array<{ id: number }>>("SELECT id FROM notes")
    : await db.select<Array<{ id: number }>>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT $1
         UNION ALL
         SELECT nf.id FROM note_folders nf JOIN descendants d ON nf.parent_id = d.id
       )
       SELECT id FROM notes WHERE folder_id IN (SELECT id FROM descendants)`,
      [scopeFolderId],
    );
  for (const note of notes) await reindexGlossaryNote(note.id);
}
