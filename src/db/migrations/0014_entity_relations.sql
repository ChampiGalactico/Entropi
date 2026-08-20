CREATE TABLE entity_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  relation_kind TEXT NOT NULL DEFAULT 'related_to',
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'system')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_type <> target_type OR source_id <> target_id),
  UNIQUE (source_type, source_id, target_type, target_id, relation_kind)
);

-- `related_to` is symmetrical. Store its endpoints in a stable order so that
-- A -> B and B -> A cannot become duplicate relationships.
INSERT OR IGNORE INTO entity_relations
  (source_type, source_id, target_type, target_id, relation_kind, origin)
SELECT
  CASE
    WHEN 'note' < entity_type OR ('note' = entity_type AND note_id < entity_id) THEN 'note'
    ELSE entity_type
  END,
  CASE
    WHEN 'note' < entity_type OR ('note' = entity_type AND note_id < entity_id) THEN note_id
    ELSE entity_id
  END,
  CASE
    WHEN 'note' < entity_type OR ('note' = entity_type AND note_id < entity_id) THEN entity_type
    ELSE 'note'
  END,
  CASE
    WHEN 'note' < entity_type OR ('note' = entity_type AND note_id < entity_id) THEN entity_id
    ELSE note_id
  END,
  'related_to',
  'manual'
FROM note_links;

CREATE INDEX idx_entity_relations_source
  ON entity_relations(source_type, source_id, relation_kind);
CREATE INDEX idx_entity_relations_target
  ON entity_relations(target_type, target_id, relation_kind);

-- Polymorphic endpoints cannot use regular SQLite foreign keys. These triggers
-- provide the same cleanup guarantee for every entity type currently supported.
CREATE TRIGGER cleanup_subject_relations AFTER DELETE ON subjects BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'subject' AND source_id = OLD.id)
     OR (target_type = 'subject' AND target_id = OLD.id);
END;

CREATE TRIGGER cleanup_task_relations AFTER DELETE ON tasks BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'task' AND source_id = OLD.id)
     OR (target_type = 'task' AND target_id = OLD.id);
END;

CREATE TRIGGER cleanup_event_relations AFTER DELETE ON events BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'event' AND source_id = OLD.id)
     OR (target_type = 'event' AND target_id = OLD.id);
END;

CREATE TRIGGER cleanup_assessment_relations AFTER DELETE ON assessments BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'assessment' AND source_id = OLD.id)
     OR (target_type = 'assessment' AND target_id = OLD.id);
END;

CREATE TRIGGER cleanup_note_relations AFTER DELETE ON notes BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'note' AND source_id = OLD.id)
     OR (target_type = 'note' AND target_id = OLD.id);
END;

CREATE TRIGGER cleanup_note_folder_relations AFTER DELETE ON note_folders BEGIN
  DELETE FROM entity_relations
  WHERE (source_type = 'note_folder' AND source_id = OLD.id)
     OR (target_type = 'note_folder' AND target_id = OLD.id);
END;
