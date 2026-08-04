CREATE TABLE teaching_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT
);

INSERT INTO teaching_roles (name, color, icon) VALUES
  ('Profesor complementario', '#8b5cf6', 'UserSpeakLinear'),
  ('Monitor', '#06b6d4', 'UserCheckLinear');

ALTER TABLE subject_staff RENAME TO subject_staff_legacy;

CREATE TABLE subject_staff (
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  professor_id INTEGER NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES teaching_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (subject_id, professor_id, role_id)
);

INSERT INTO subject_staff (subject_id, professor_id, role_id)
SELECT
  subject_id,
  professor_id,
  CASE role
    WHEN 'complementary' THEN (SELECT id FROM teaching_roles WHERE name = 'Profesor complementario')
    WHEN 'monitor' THEN (SELECT id FROM teaching_roles WHERE name = 'Monitor')
  END
FROM subject_staff_legacy
WHERE role IN ('complementary', 'monitor');

DROP TABLE subject_staff_legacy;

CREATE INDEX idx_subject_staff_subject ON subject_staff(subject_id);
CREATE INDEX idx_subject_staff_role ON subject_staff(role_id);
