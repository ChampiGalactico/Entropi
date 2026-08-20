import { getDb } from "../connection";
import type { EntityRelation, EntityType, RelationOrigin, ResolvedEntityRelation } from "../../types";

export interface RelationEndpoint {
  type: EntityType;
  id: number;
}

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
         NULL AS inherited_from_folder_id
       FROM entity_relations er
       WHERE er.relation_kind = 'related_to' AND er.origin = 'manual'
         AND ((er.source_type = 'note' AND er.source_id = $1)
           OR (er.target_type = 'note' AND er.target_id = $1))

       UNION ALL

       SELECT er.target_type, er.target_id, er.relation_kind, 'inherited', er.id, er.source_id
       FROM entity_relations er
       JOIN folder_ancestors fa ON fa.id = er.source_id
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
  await db.execute(
    `DELETE FROM entity_relations
     WHERE relation_kind = $1 AND origin = 'manual'
       AND ((source_type = $2 AND source_id = $3) OR (target_type = $2 AND target_id = $3))`,
    [kind, entity.type, entity.id],
  );
  for (const target of targets) await addEntityRelation(entity, target, kind, "manual");
}
