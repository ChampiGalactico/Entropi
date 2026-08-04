ALTER TABLE grade_components ADD COLUMN is_group INTEGER NOT NULL DEFAULT 0;
ALTER TABLE grade_components ADD COLUMN grade REAL;
ALTER TABLE grade_components ADD COLUMN date DATE;
ALTER TABLE grade_components ADD COLUMN assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL;
ALTER TABLE grade_components ADD COLUMN notes TEXT;

-- Preserve the previous flat entries as editable child components.
UPDATE grade_components
SET is_group = 1
WHERE id IN (SELECT DISTINCT grade_component_id FROM grade_entries);

INSERT INTO grade_components
  (subject_id, parent_id, name, weight, sort_order, is_group, grade, date, assessment_id, notes)
SELECT
  parent.subject_id,
  entry.grade_component_id,
  CASE WHEN TRIM(entry.name) = '' THEN parent.name ELSE entry.name END,
  entry.weight,
  entry.id,
  0,
  entry.grade,
  entry.date,
  entry.assessment_id,
  entry.notes
FROM grade_entries entry
JOIN grade_components parent ON parent.id = entry.grade_component_id;

DELETE FROM grade_entries;
