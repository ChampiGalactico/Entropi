CREATE TEMP TABLE _semester_notes_folder_backfill (
  semester_id INTEGER PRIMARY KEY,
  folder_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL
);

INSERT INTO _semester_notes_folder_backfill (semester_id, folder_id, name)
WITH
  folder_base(max_id) AS (SELECT COALESCE(MAX(id), 0) FROM note_folders),
  numbered_semesters AS (
    SELECT id, name, ROW_NUMBER() OVER (ORDER BY id) AS row_number
    FROM semesters
  )
SELECT s.id, folder_base.max_id + s.row_number, s.name
FROM numbered_semesters s CROSS JOIN folder_base;

INSERT INTO note_folders (id, name, color, parent_id)
SELECT folder_id, name, '#6366f1', NULL
FROM _semester_notes_folder_backfill;

INSERT INTO entity_relations
  (source_type, source_id, target_type, target_id, relation_kind, origin)
SELECT 'note_folder', folder_id, 'semester', semester_id, 'context_of', 'system'
FROM _semester_notes_folder_backfill;

DROP TABLE _semester_notes_folder_backfill;

-- Move every managed subject folder below the managed folder for its semester.
UPDATE note_folders
SET parent_id = (
  SELECT semester_relation.source_id
  FROM entity_relations subject_relation
  JOIN subjects s
    ON subject_relation.target_type = 'subject' AND subject_relation.target_id = s.id
  JOIN entity_relations semester_relation
    ON semester_relation.target_type = 'semester' AND semester_relation.target_id = s.semester_id
   AND semester_relation.source_type = 'note_folder'
   AND semester_relation.relation_kind = 'context_of' AND semester_relation.origin = 'system'
  WHERE subject_relation.source_type = 'note_folder'
    AND subject_relation.source_id = note_folders.id
    AND subject_relation.relation_kind = 'context_of' AND subject_relation.origin = 'system'
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM entity_relations subject_relation
  WHERE subject_relation.source_type = 'note_folder'
    AND subject_relation.source_id = note_folders.id
    AND subject_relation.target_type = 'subject'
    AND subject_relation.relation_kind = 'context_of' AND subject_relation.origin = 'system'
);

CREATE TRIGGER cleanup_semester_relations AFTER DELETE ON semesters BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'semester' AND source_id = OLD.id)
     OR (target_type = 'semester' AND target_id = OLD.id);
END;

CREATE TRIGGER create_semester_notes_folder AFTER INSERT ON semesters BEGIN
  INSERT INTO note_folders (name, color, parent_id)
  VALUES (NEW.name, '#6366f1', NULL);

  INSERT INTO entity_relations
    (source_type, source_id, target_type, target_id, relation_kind, origin)
  VALUES ('note_folder', last_insert_rowid(), 'semester', NEW.id, 'context_of', 'system');
END;

CREATE TRIGGER update_semester_notes_folder AFTER UPDATE OF name ON semesters BEGIN
  UPDATE note_folders
  SET name = CASE WHEN name = OLD.name THEN NEW.name ELSE name END
  WHERE id IN (
    SELECT source_id FROM entity_relations
    WHERE source_type = 'note_folder'
      AND target_type = 'semester' AND target_id = NEW.id
      AND relation_kind = 'context_of' AND origin = 'system'
  );
END;

-- Migration 15 created subject folders at the root. Replace that trigger so
-- future subject folders are born inside their semester folder instead.
DROP TRIGGER create_subject_notes_folder;

CREATE TRIGGER create_subject_notes_folder AFTER INSERT ON subjects BEGIN
  INSERT INTO note_folders (name, color, parent_id)
  VALUES (
    NEW.name,
    NEW.color,
    (SELECT source_id FROM entity_relations
     WHERE source_type = 'note_folder'
       AND target_type = 'semester' AND target_id = NEW.semester_id
       AND relation_kind = 'context_of' AND origin = 'system'
     LIMIT 1)
  );

  INSERT INTO entity_relations
    (source_type, source_id, target_type, target_id, relation_kind, origin)
  VALUES ('note_folder', last_insert_rowid(), 'subject', NEW.id, 'context_of', 'system');
END;

CREATE TRIGGER move_subject_notes_folder AFTER UPDATE OF semester_id ON subjects BEGIN
  UPDATE note_folders
  SET parent_id = (
    SELECT source_id FROM entity_relations
    WHERE source_type = 'note_folder'
      AND target_type = 'semester' AND target_id = NEW.semester_id
      AND relation_kind = 'context_of' AND origin = 'system'
    LIMIT 1
  )
  WHERE id IN (
    SELECT source_id FROM entity_relations
    WHERE source_type = 'note_folder'
      AND target_type = 'subject' AND target_id = NEW.id
      AND relation_kind = 'context_of' AND origin = 'system'
  );
END;
