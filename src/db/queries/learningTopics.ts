import { getDb } from "../connection";
import type { LearningTopic } from "../../types";

export async function listLearningTopics(): Promise<LearningTopic[]> {
  const db = await getDb();
  return db.select<LearningTopic[]>(
    "SELECT * FROM learning_topics ORDER BY priority ASC, created_at ASC",
  );
}

export async function createLearningTopic(
  values: Omit<LearningTopic, "id" | "created_at">,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO learning_topics (title, description, priority, status, notes_content)
     VALUES ($1, $2, $3, $4, $5)`,
    [values.title, values.description, values.priority, values.status, values.notes_content],
  );
  return result.lastInsertId as number;
}

export async function updateLearningTopic(
  id: number,
  values: Omit<LearningTopic, "id" | "created_at">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE learning_topics SET title = $1, description = $2, priority = $3, status = $4, notes_content = $5
     WHERE id = $6`,
    [values.title, values.description, values.priority, values.status, values.notes_content, id],
  );
}

export async function deleteLearningTopic(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM learning_topics WHERE id = $1", [id]);
}
