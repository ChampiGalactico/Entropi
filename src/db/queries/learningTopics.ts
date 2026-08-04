import { getDb } from "../connection";
import type { LearningTopic } from "../../types";

let workflowSupport: Promise<boolean> | null = null;

async function supportsTopicWorkflow(): Promise<boolean> {
  if (!workflowSupport) {
    workflowSupport = getDb().then(async (db) => {
      const columns = await db.select<Array<{ name: string }>>("PRAGMA table_info(learning_topics)");
      return columns.some((column) => column.name === "archived");
    });
  }
  return workflowSupport;
}

export async function listLearningTopics(includeArchived = false): Promise<LearningTopic[]> {
  const db = await getDb();
  if (!(await supportsTopicWorkflow())) {
    const rows = await db.select<Array<Omit<LearningTopic, "archived">>>(
      `SELECT * FROM learning_topics
       ORDER BY CASE status WHEN 'in_progress' THEN 1 WHEN 'backlog' THEN 2 ELSE 3 END,
                priority ASC, created_at ASC`,
    );
    return rows.map((row) => ({ ...row, archived: 0 }));
  }
  return db.select<LearningTopic[]>(
    `SELECT * FROM learning_topics ${includeArchived ? "" : "WHERE archived = 0"}
     ORDER BY CASE status WHEN 'in_progress' THEN 1 WHEN 'started' THEN 2 WHEN 'backlog' THEN 3 ELSE 4 END,
              priority ASC, created_at ASC`,
  );
}

export async function createLearningTopic(
  values: Omit<LearningTopic, "id" | "created_at">,
): Promise<number> {
  const db = await getDb();
  if (!(await supportsTopicWorkflow())) {
    const result = await db.execute(
      `INSERT INTO learning_topics (title, description, priority, status, notes_content)
       VALUES ($1, $2, $3, $4, $5)`,
      [values.title, values.description, values.priority, values.status === "started" ? "in_progress" : values.status, values.notes_content],
    );
    return result.lastInsertId as number;
  }
  const result = await db.execute(
    `INSERT INTO learning_topics (title, description, priority, status, notes_content, archived)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [values.title, values.description, values.priority, values.status, values.notes_content, values.archived],
  );
  return result.lastInsertId as number;
}

export async function updateLearningTopic(
  id: number,
  values: Omit<LearningTopic, "id" | "created_at">,
): Promise<void> {
  const db = await getDb();
  if (!(await supportsTopicWorkflow())) {
    await db.execute(
      `UPDATE learning_topics SET title = $1, description = $2, priority = $3, status = $4, notes_content = $5
       WHERE id = $6`,
      [values.title, values.description, values.priority, values.status === "started" ? "in_progress" : values.status, values.notes_content, id],
    );
    return;
  }
  await db.execute(
    `UPDATE learning_topics SET title = $1, description = $2, priority = $3, status = $4, notes_content = $5, archived = $6
     WHERE id = $7`,
    [values.title, values.description, values.priority, values.status, values.notes_content, values.archived, id],
  );
}

export async function setLearningTopicArchived(id: number, archived: boolean): Promise<void> {
  const db = await getDb();
  if (!(await supportsTopicWorkflow())) return;
  await db.execute("UPDATE learning_topics SET archived = $1 WHERE id = $2", [archived ? 1 : 0, id]);
}

export async function deleteLearningTopic(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM learning_topics WHERE id = $1", [id]);
}
