ALTER TABLE grade_entries ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE grade_entries ADD COLUMN weight REAL NOT NULL DEFAULT 0;

-- The simplified model has one level: existing nested items become components.
UPDATE grade_components SET parent_id = NULL WHERE parent_id IS NOT NULL;
