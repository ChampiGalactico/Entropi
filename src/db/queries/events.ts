import { getDb } from "../connection";
import type { Event } from "../../types";

export async function listEventsInRange(startDate: string, endDate: string): Promise<Event[]> {
  const db = await getDb();
  return db.select<Event[]>(
    "SELECT * FROM events WHERE date BETWEEN $1 AND $2 ORDER BY date ASC, start_time ASC",
    [startDate, endDate],
  );
}

export async function getEvent(id: number): Promise<Event | null> {
  const db = await getDb();
  const rows = await db.select<Event[]>("SELECT * FROM events WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createEvent(values: Omit<Event, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO events
      (event_type_id, title, description, date, start_time, end_time, location_id, notes_content, is_recurring, recurrence_rule)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      values.event_type_id,
      values.title,
      values.description,
      values.date,
      values.start_time,
      values.end_time,
      values.location_id,
      values.notes_content,
      values.is_recurring,
      values.recurrence_rule,
    ],
  );
  return result.lastInsertId as number;
}

export async function updateEvent(id: number, values: Omit<Event, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE events SET
      event_type_id = $1, title = $2, description = $3, date = $4, start_time = $5,
      end_time = $6, location_id = $7, notes_content = $8, is_recurring = $9, recurrence_rule = $10
     WHERE id = $11`,
    [
      values.event_type_id,
      values.title,
      values.description,
      values.date,
      values.start_time,
      values.end_time,
      values.location_id,
      values.notes_content,
      values.is_recurring,
      values.recurrence_rule,
      id,
    ],
  );
}

export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM events WHERE id = $1", [id]);
}
