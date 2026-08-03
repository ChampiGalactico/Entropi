-- Default lookup data and grading config, seeded on first launch.

INSERT INTO session_types (name, color, icon) VALUES
  ('Magistral', '#6366f1', NULL),
  ('Complementaria', '#22c55e', NULL),
  ('Laboratorio', '#eab308', NULL);

INSERT INTO assessment_types (name, color, icon) VALUES
  ('Quiz', '#3b82f6', NULL),
  ('Parcial', '#f97316', NULL),
  ('Final', '#ef4444', NULL),
  ('Sustentación', '#a855f7', NULL);

INSERT INTO task_types (name, color) VALUES
  ('Class Prep', '#6366f1'),
  ('Homework', '#22c55e'),
  ('Project', '#eab308'),
  ('Personal', '#ec4899');

INSERT INTO event_types (name, color) VALUES
  ('Meeting', '#3b82f6'),
  ('Webinar', '#a855f7'),
  ('Personal', '#ec4899');

INSERT INTO grading_config (id, scale_min, scale_max, min_passing_grade, decimal_places_display)
VALUES (1, 0.0, 5.0, 3.0, 2);
