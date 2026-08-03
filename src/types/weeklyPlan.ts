export interface WeeklyPlan {
  id: number;
  week_start: string;
  goals: string | null;
  reflection: string | null;
  created_at: string;
}
