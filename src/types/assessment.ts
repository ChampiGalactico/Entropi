import type { AssessmentStatus } from "./common";

export interface Assessment {
  id: number;
  subject_id: number;
  assessment_type_id: number;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location_id: number | null;
  notes_content: string | null;
  status: AssessmentStatus;
  grade: number | null;
}
