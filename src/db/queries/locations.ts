import { getDb } from "../connection";
import type { Location } from "../../types";

export async function listLocations(): Promise<Location[]> {
  const db = await getDb();
  return db.select<Location[]>("SELECT * FROM locations ORDER BY name ASC");
}

export async function getLocation(id: number): Promise<Location | null> {
  const db = await getDb();
  const rows = await db.select<Location[]>("SELECT * FROM locations WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createLocation(
  values: Omit<Location, "id">,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO locations (name, building, room, type, link, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [values.name, values.building, values.room, values.type, values.link, values.notes],
  );
  return result.lastInsertId as number;
}

export async function updateLocation(id: number, values: Omit<Location, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE locations SET name = $1, building = $2, room = $3, type = $4, link = $5, notes = $6
     WHERE id = $7`,
    [values.name, values.building, values.room, values.type, values.link, values.notes, id],
  );
}

export async function deleteLocation(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM locations WHERE id = $1", [id]);
}
