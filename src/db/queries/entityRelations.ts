import { getDb } from "../connection";
import type { EntityRelation, EntityType, RelationOrigin } from "../../types";

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
