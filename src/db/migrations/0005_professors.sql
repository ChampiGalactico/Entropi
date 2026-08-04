CREATE TABLE professors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  office TEXT,
  office_hours TEXT,
  notes TEXT
);

ALTER TABLE subjects ADD COLUMN professor_id INTEGER REFERENCES professors(id) ON DELETE SET NULL;
ALTER TABLE class_sessions ADD COLUMN professor_id INTEGER REFERENCES professors(id) ON DELETE SET NULL;

INSERT INTO professors (name)
SELECT DISTINCT TRIM(professor)
FROM subjects
WHERE professor IS NOT NULL AND TRIM(professor) <> '';

UPDATE subjects
SET professor_id = (
  SELECT professors.id FROM professors WHERE professors.name = TRIM(subjects.professor) LIMIT 1
)
WHERE professor IS NOT NULL AND TRIM(professor) <> '';

CREATE TABLE subject_staff (
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  professor_id INTEGER NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('complementary', 'monitor')),
  PRIMARY KEY (subject_id, professor_id, role)
);

CREATE INDEX idx_subject_staff_subject ON subject_staff(subject_id);
CREATE INDEX idx_class_sessions_professor ON class_sessions(professor_id);
