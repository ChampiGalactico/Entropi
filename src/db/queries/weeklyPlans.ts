import { getDb } from "../connection";
import type { WeeklyPlan } from "../../types";

export async function getWeeklyPlanByWeekStart(weekStart: string): Promise<WeeklyPlan | null> {
  const db = await getDb();
  const rows = await db.select<WeeklyPlan[]>(
    "SELECT * FROM weekly_plans WHERE week_start = $1",
    [weekStart],
  );
  return rows[0] ?? null;
}

export async function listWeeklyPlans(): Promise<WeeklyPlan[]> {
  const db = await getDb();
  return db.select<WeeklyPlan[]>("SELECT * FROM weekly_plans ORDER BY week_start DESC");
}

export async function createWeeklyPlan(
  values: Omit<WeeklyPlan, "id" | "created_at">,
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO weekly_plans (week_start, goals, reflection) VALUES ($1, $2, $3)",
    [values.week_start, values.goals, values.reflection],
  );
  return result.lastInsertId as number;
}

export async function updateWeeklyPlan(
  id: number,
  values: Omit<WeeklyPlan, "id" | "created_at">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE weekly_plans SET week_start = $1, goals = $2, reflection = $3 WHERE id = $4",
    [values.week_start, values.goals, values.reflection, id],
  );
}
