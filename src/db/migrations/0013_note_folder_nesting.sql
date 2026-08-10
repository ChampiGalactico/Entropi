ALTER TABLE note_folders ADD COLUMN parent_id INTEGER REFERENCES note_folders(id) ON DELETE CASCADE;

CREATE INDEX idx_note_folders_parent ON note_folders(parent_id);
