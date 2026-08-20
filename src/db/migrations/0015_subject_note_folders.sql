-- Assign deterministic new ids so existing installations can create every
-- subject folder and its relationship in one migration without guessing by name.
CREATE TEMP TABLE _subject_notes_folder_backfill (
  subject_id INTEGER PRIMARY KEY,
  folder_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

INSERT INTO _subject_notes_folder_backfill (subject_id, folder_id, name, color)
WITH
  folder_base(max_id) AS (SELECT COALESCE(MAX(id), 0) FROM note_folders),
  numbered_subjects AS (
    SELECT id, name, color, ROW_NUMBER() OVER (ORDER BY id) AS row_number
    FROM subjects
  )
SELECT s.id, folder_base.max_id + s.row_number, s.name, s.color
FROM numbered_subjects s CROSS JOIN folder_base;

INSERT INTO note_folders (id, name, color, parent_id)
SELECT folder_id, name, color, NULL
FROM _subject_notes_folder_backfill;

INSERT INTO entity_relations
  (source_type, source_id, target_type, target_id, relation_kind, origin)
SELECT 'note_folder', folder_id, 'subject', subject_id, 'context_of', 'system'
FROM _subject_notes_folder_backfill;

DROP TABLE _subject_notes_folder_backfill;

-- Keeping this at the database boundary makes creation atomic and guarantees
-- the invariant regardless of which screen or future command creates a subject.
CREATE TRIGGER create_subject_notes_folder AFTER INSERT ON subjects BEGIN
  INSERT INTO note_folders (name, color, parent_id)
  VALUES (NEW.name, NEW.color, NULL);

  INSERT INTO entity_relations
    (source_type, source_id, target_type, target_id, relation_kind, origin)
  VALUES ('note_folder', last_insert_rowid(), 'subject', NEW.id, 'context_of', 'system');
END;

-- Continue mirroring the defaults until the user customizes the folder's name
-- or color. Once customized, later subject edits preserve that choice.
CREATE TRIGGER update_subject_notes_folder AFTER UPDATE OF name, color ON subjects BEGIN
  UPDATE note_folders
  SET
    name = CASE WHEN name = OLD.name THEN NEW.name ELSE name END,
    color = CASE WHEN color = OLD.color THEN NEW.color ELSE color END
  WHERE id IN (
    SELECT source_id FROM entity_relations
    WHERE source_type = 'note_folder'
      AND target_type = 'subject'
      AND target_id = NEW.id
      AND relation_kind = 'context_of'
      AND origin = 'system'
  );
END;
