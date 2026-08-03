export interface Event {
  id: number;
  event_type_id: number;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  location_id: number | null;
  notes_content: string | null;
  is_recurring: 0 | 1;
  recurrence_rule: string | null;
}
