import { getDb } from "../connection";
import type { GradingConfig } from "../../types";

export async function getGradingConfig(): Promise<GradingConfig> {
  const db = await getDb();
  const rows = await db.select<GradingConfig[]>("SELECT * FROM grading_config WHERE id = 1");
  if (!rows[0]) {
    throw new Error("grading_config singleton row is missing");
  }
  return rows[0];
}

export async function updateGradingConfig(
  values: Omit<GradingConfig, "id">,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE grading_config SET scale_min = $1, scale_max = $2, min_passing_grade = $3, decimal_places_display = $4
     WHERE id = 1`,
    [values.scale_min, values.scale_max, values.min_passing_grade, values.decimal_places_display],
  );
}
