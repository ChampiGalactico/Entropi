CREATE TABLE note_links (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('subject', 'task', 'event', 'assessment', 'note')),
  entity_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, entity_type, entity_id)
);

INSERT OR IGNORE INTO note_links (note_id, entity_type, entity_id)
SELECT id, linked_entity_type, linked_entity_id
FROM notes
WHERE linked_entity_type IS NOT NULL AND linked_entity_id IS NOT NULL;

CREATE INDEX idx_note_links_entity ON note_links(entity_type, entity_id);
