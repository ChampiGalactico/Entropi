import { getDb } from "../connection";
import type { EntityRelation, EntityType, LinkedEntityType, RelationCandidate, RelationOrigin, ResolvedEntityRelation } from "../../types";

export interface RelationEndpoint {
  type: EntityType;
  id: number;
}

export type RelationCandidateFilter = LinkedEntityType | "all";

const relationCandidatesSql = `WITH RECURSIVE
  folder_ancestors(folder_id, ancestor_id) AS (
    SELECT id, id FROM note_folders
    UNION ALL
    SELECT fa.folder_id, nf.parent_id
    FROM folder_ancestors fa JOIN note_folders nf ON nf.id = fa.ancestor_id
    WHERE nf.parent_id IS NOT NULL
  ),
  note_edges(note_id, entity_type, entity_id) AS (
    SELECT
      CASE WHEN source_type = 'note' THEN source_id ELSE target_id END,
      CASE WHEN source_type = 'note' THEN target_type ELSE source_type END,
      CASE WHEN source_type = 'note' THEN target_id ELSE source_id END
    FROM entity_relations
    WHERE relation_kind = 'related_to' AND (source_type = 'note' OR target_type = 'note')
  ),
  note_folder_subjects(note_id, subject_id) AS (
    SELECT DISTINCT n.id, er.target_id
    FROM notes n
    JOIN folder_ancestors fa ON fa.folder_id = n.folder_id
    JOIN entity_relations er
      ON er.source_type = 'note_folder' AND er.source_id = fa.ancestor_id
     AND er.target_type = 'subject' AND er.relation_kind = 'context_of'
  ),
  context_subjects(subject_id) AS (
    SELECT entity_id FROM note_edges WHERE note_id = $1 AND entity_type = 'subject'
    UNION
    SELECT t.subject_id FROM note_edges ne JOIN tasks t ON ne.entity_type = 'task' AND t.id = ne.entity_id
      WHERE ne.note_id = $1 AND t.subject_id IS NOT NULL
    UNION
    SELECT a.subject_id FROM note_edges ne JOIN assessments a ON ne.entity_type = 'assessment' AND a.id = ne.entity_id
      WHERE ne.note_id = $1
    UNION
    SELECT subject_id FROM note_folder_subjects WHERE note_id = $1
  ),
  candidates(type, id, label, subtitle, color, context_subject_id) AS (
    SELECT 'subject', s.id, s.name, s.code, s.color, s.id FROM subjects s
    UNION ALL
    SELECT 'task', t.id, t.title, s.name, s.color, t.subject_id
      FROM tasks t LEFT JOIN subjects s ON s.id = t.subject_id
    UNION ALL
    SELECT 'assessment', a.id, a.title, s.name, s.color, a.subject_id
      FROM assessments a JOIN subjects s ON s.id = a.subject_id
    UNION ALL
    SELECT 'event', e.id, e.title, e.date, NULL, NULL FROM events e
    UNION ALL
    SELECT 'note', n.id, n.title, nf.name, nf.color, NULL
      FROM notes n LEFT JOIN note_folders nf ON nf.id = n.folder_id
  )
SELECT
  c.type,
  c.id,
  c.label,
  c.subtitle,
  c.color,
  CASE
    WHEN c.context_subject_id IN (SELECT subject_id FROM context_subjects) THEN 1
    WHEN c.type = 'note' AND EXISTS (
      SELECT 1 FROM note_folder_subjects nfs
      WHERE nfs.note_id = c.id AND nfs.subject_id IN (SELECT subject_id FROM context_subjects)
    ) THEN 1
    ELSE 0
  END AS is_suggested
FROM candidates c
WHERE NOT (c.type = 'note' AND c.id = $1)
  AND ($2 = '' OR LOWER(c.label || ' ' || COALESCE(c.subtitle, '')) LIKE '%' || LOWER($2) || '%')
  AND ($3 = 'all' OR c.type = $3)
  AND ($4 IS NULL OR c.id = $4)
ORDER BY is_suggested DESC, c.label COLLATE NOCASE ASC
LIMIT $5`;

function compareEndpoints(left: RelationEndpoint, right: RelationEndpoint): number {
  return left.type.localeCompare(right.type) || left.id - right.id;
}

function normalizeEndpoints(source: RelationEndpoint, target: RelationEndpoint, kind: string) {
  if (kind !== "related_to" || compareEndpoints(source, target) <= 0) return { source, target };
  return { source: target, target: source };
}

export async function listEntityRelations(type: EntityType, id: number): Promise<EntityRelation[]> {
  const db = await getDb();
  return db.select<EntityRelation[]>(
    `SELECT * FROM entity_relations
     WHERE (source_type = $1 AND source_id = $2)
        OR (target_type = $1 AND target_id = $2)
     ORDER BY created_at ASC, id ASC`,
    [type, id],
  );
}

export async function listResolvedNoteRelations(noteId: number): Promise<ResolvedEntityRelation[]> {
  const db = await getDb();
  return db.select<ResolvedEntityRelation[]>(
    `WITH RECURSIVE folder_ancestors(id) AS (
       SELECT folder_id FROM notes WHERE id = $1 AND folder_id IS NOT NULL
       UNION ALL
       SELECT nf.parent_id FROM note_folders nf
       JOIN folder_ancestors fa ON nf.id = fa.id
       WHERE nf.parent_id IS NOT NULL
     ),
     resolved AS (
       SELECT
         CASE WHEN er.source_type = 'note' AND er.source_id = $1 THEN er.target_type ELSE er.source_type END AS entity_type,
         CASE WHEN er.source_type = 'note' AND er.source_id = $1 THEN er.target_id ELSE er.source_id END AS entity_id,
         er.relation_kind,
         'manual' AS origin,
         er.id AS relation_id,
         NULL AS inherited_from_folder_id,
         NULL AS inherited_from_folder_name
       FROM entity_relations er
       WHERE er.relation_kind = 'related_to' AND er.origin = 'manual'
         AND ((er.source_type = 'note' AND er.source_id = $1)
           OR (er.target_type = 'note' AND er.target_id = $1))

       UNION ALL

       SELECT er.target_type, er.target_id, er.relation_kind, 'inherited', er.id, er.source_id, nf.name
       FROM entity_relations er
       JOIN folder_ancestors fa ON fa.id = er.source_id
       JOIN note_folders nf ON nf.id = er.source_id
       WHERE er.source_type = 'note_folder' AND er.relation_kind = 'context_of'
     )
     SELECT * FROM resolved
     ORDER BY CASE origin WHEN 'inherited' THEN 0 ELSE 1 END, entity_type, entity_id`,
    [noteId],
  );
}

export async function listNoteSubjectContextIds(noteId: number): Promise<number[]> {
  const relations = await listResolvedNoteRelations(noteId);
  return [...new Set(relations.filter((relation) => relation.entity_type === "subject").map((relation) => relation.entity_id))];
}

export async function searchRelationCandidates(
  noteId: number,
  query = "",
  type: RelationCandidateFilter = "all",
  limit = 40,
): Promise<RelationCandidate[]> {
  const db = await getDb();
  return db.select<RelationCandidate[]>(relationCandidatesSql, [noteId, query.trim(), type, null, limit]);
}

export async function getRelationCandidates(
  noteId: number,
  endpoints: Array<{ type: LinkedEntityType; id: number }>,
): Promise<RelationCandidate[]> {
  const db = await getDb();
  const candidates = await Promise.all(endpoints.map(async (endpoint) => {
    const rows = await db.select<RelationCandidate[]>(relationCandidatesSql, [noteId, "", endpoint.type, endpoint.id, 1]);
    return rows[0] ?? null;
  }));
  return candidates.filter((candidate): candidate is RelationCandidate => candidate !== null);
}

export async function addEntityRelation(
  source: RelationEndpoint,
  target: RelationEndpoint,
  kind = "related_to",
  origin: RelationOrigin = "manual",
): Promise<void> {
  if (source.type === target.type && source.id === target.id) return;
  const db = await getDb();
  const normalized = normalizeEndpoints(source, target, kind);
  await db.execute(
    `INSERT OR IGNORE INTO entity_relations
      (source_type, source_id, target_type, target_id, relation_kind, origin)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [normalized.source.type, normalized.source.id, normalized.target.type, normalized.target.id, kind, origin],
  );
}

export async function removeEntityRelation(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM entity_relations WHERE id = $1", [id]);
}

export async function replaceManualRelations(
  entity: RelationEndpoint,
  targets: RelationEndpoint[],
  kind = "related_to",
): Promise<void> {
  const db = await getDb();
  const current = await db.select<EntityRelation[]>(
    `SELECT * FROM entity_relations
     WHERE relation_kind = $1 AND origin = 'manual'
       AND ((source_type = $2 AND source_id = $3) OR (target_type = $2 AND target_id = $3))`,
    [kind, entity.type, entity.id],
  );
  const desired = new Map(
    targets
      .filter((target) => target.type !== entity.type || target.id !== entity.id)
      .map((target) => [`${target.type}:${target.id}`, target]),
  );

  for (const relation of current) {
    const entityIsSource = relation.source_type === entity.type && relation.source_id === entity.id;
    const other = entityIsSource
      ? { type: relation.target_type, id: relation.target_id }
      : { type: relation.source_type, id: relation.source_id };
    const key = `${other.type}:${other.id}`;
    if (desired.has(key)) desired.delete(key);
    else await db.execute("DELETE FROM entity_relations WHERE id = $1", [relation.id]);
  }

  for (const target of desired.values()) await addEntityRelation(entity, target, kind, "manual");
}
