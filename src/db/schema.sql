-- Vida — Life Organizer
-- Initial schema. All grade values are REAL and never rounded by the DB layer.

PRAGMA foreign_keys = ON;

-- ============================================================
-- Lookup tables (fully customizable by the user)
-- ============================================================

CREATE TABLE session_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE assessment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE task_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

-- ============================================================
-- Core tables
-- ============================================================

CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  building TEXT,
  room TEXT,
  type TEXT NOT NULL CHECK (type IN ('physical', 'virtual')),
  link TEXT,
  notes TEXT
);

CREATE TABLE semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
);

CREATE TABLE subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  professor TEXT,
  color TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_gradable INTEGER NOT NULL DEFAULT 1 CHECK (is_gradable IN (0, 1)),
  credits REAL,
  scale_max_override REAL,
  min_passing_override REAL,
  notes_content TEXT
);

CREATE TABLE class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  session_type_id INTEGER NOT NULL REFERENCES session_types(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location_id INTEGER REFERENCES locations(id)
);

CREATE TABLE assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assessment_type_id INTEGER NOT NULL REFERENCES assessment_types(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location_id INTEGER REFERENCES locations(id),
  notes_content TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  grade REAL
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  task_type_id INTEGER NOT NULL REFERENCES task_types(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TEXT,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location_id INTEGER REFERENCES locations(id),
  notes_content TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
  recurrence_rule TEXT
);

CREATE TABLE learning_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'completed')),
  notes_content TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start DATE NOT NULL,
  goals TEXT,
  reflection TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  linked_entity_type TEXT CHECK (linked_entity_type IN ('subject', 'task', 'event', 'assessment')),
  linked_entity_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Grading system — never rounded at any step
-- ============================================================

CREATE TABLE grading_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  scale_min REAL NOT NULL DEFAULT 0.0,
  scale_max REAL NOT NULL DEFAULT 5.0,
  min_passing_grade REAL NOT NULL DEFAULT 3.0,
  decimal_places_display INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE grade_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES grade_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight REAL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE grade_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_component_id INTEGER NOT NULL REFERENCES grade_components(id) ON DELETE CASCADE,
  grade REAL NOT NULL,
  date DATE NOT NULL,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
  notes TEXT
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_subjects_semester ON subjects(semester_id);
CREATE INDEX idx_class_sessions_subject ON class_sessions(subject_id);
CREATE INDEX idx_assessments_subject ON assessments(subject_id);
CREATE INDEX idx_assessments_date ON assessments(date);
CREATE INDEX idx_tasks_subject ON tasks(subject_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_grade_components_subject ON grade_components(subject_id);
CREATE INDEX idx_grade_components_parent ON grade_components(parent_id);
CREATE INDEX idx_grade_entries_component ON grade_entries(grade_component_id);
CREATE INDEX idx_notes_linked_entity ON notes(linked_entity_type, linked_entity_id);
