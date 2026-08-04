export interface GradingConfig {
  id: 1;
  scale_min: number;
  scale_max: number;
  min_passing_grade: number;
  decimal_places_display: number;
}

export interface GradeComponent {
  id: number;
  subject_id: number;
  parent_id: number | null;
  name: string;
  weight: number | null;
  sort_order: number;
  is_group: number;
  grade: number | null;
  date: string | null;
  assessment_id: number | null;
  notes: string | null;
}

export interface GradeEntry {
  id: number;
  grade_component_id: number;
  name: string;
  grade: number;
  weight: number;
  date: string;
  assessment_id: number | null;
  notes: string | null;
}
