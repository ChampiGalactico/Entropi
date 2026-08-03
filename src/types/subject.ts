export interface Subject {
  id: number;
  semester_id: number;
  name: string;
  code: string | null;
  professor: string | null;
  color: string;
  start_date: string;
  end_date: string;
  is_gradable: 0 | 1;
  credits: number | null;
  scale_max_override: number | null;
  min_passing_override: number | null;
  notes_content: string | null;
}

export interface ClassSession {
  id: number;
  subject_id: number;
  session_type_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location_id: number | null;
}
