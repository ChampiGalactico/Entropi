import { getDb } from "../connection";
import type { AssessmentType, EventType, SessionType, TaskType } from "../../types";

export type LookupTableName =
  | "session_types"
  | "assessment_types"
  | "event_types"
  | "task_types";

const LOOKUP_TABLES: readonly LookupTableName[] = [
  "session_types",
  "assessment_types",
  "event_types",
  "task_types",
];

function assertValidTable(table: LookupTableName) {
  if (!LOOKUP_TABLES.includes(table)) {
    throw new Error(`Invalid lookup table: ${table}`);
  }
}

type LookupRow = SessionType | AssessmentType | EventType | TaskType;

export async function listLookupRows<T extends LookupRow>(table: LookupTableName): Promise<T[]> {
  assertValidTable(table);
  const db = await getDb();
  return db.select<T[]>(`SELECT * FROM ${table} ORDER BY id ASC`);
}

export async function createLookupRow(
  table: LookupTableName,
  values: { name: string; color: string; icon?: string | null },
): Promise<number> {
  assertValidTable(table);
  const db = await getDb();
  const result = await db.execute(
        `INSERT INTO ${table} (name, color, icon) VALUES ($1, $2, $3)`,
        [values.name, values.color, values.icon ?? null],
      );
  return result.lastInsertId as number;
}

export async function updateLookupRow(
  table: LookupTableName,
  id: number,
  values: { name: string; color: string; icon?: string | null },
): Promise<void> {
  assertValidTable(table);
  const db = await getDb();
  await db.execute(`UPDATE ${table} SET name = $1, color = $2, icon = $3 WHERE id = $4`, [
    values.name,
    values.color,
    values.icon ?? null,
    id,
  ]);
}

export async function deleteLookupRow(table: LookupTableName, id: number): Promise<void> {
  assertValidTable(table);
  const db = await getDb();
  await db.execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
}
