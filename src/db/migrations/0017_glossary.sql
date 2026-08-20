CREATE TABLE glossary_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  scope_folder_id INTEGER REFERENCES note_folders(id) ON DELETE CASCADE,
  source_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  source_block_id TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_glossary_entries_scope_term
  ON glossary_entries(normalized_term, COALESCE(scope_folder_id, 0));
CREATE INDEX idx_glossary_entries_scope ON glossary_entries(scope_folder_id);

CREATE TABLE glossary_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  UNIQUE(entry_id, normalized_alias)
);

CREATE INDEX idx_glossary_aliases_normalized ON glossary_aliases(normalized_alias);

CREATE TABLE glossary_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_glossary_sections_entry ON glossary_sections(entry_id, sort_order);

CREATE TABLE glossary_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  matched_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  context_excerpt TEXT NOT NULL,
  indexed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entry_id, note_id, block_id, start_offset)
);

CREATE INDEX idx_glossary_occurrences_entry ON glossary_occurrences(entry_id, note_id);
CREATE INDEX idx_glossary_occurrences_note ON glossary_occurrences(note_id);

-- Explicit cleanup keeps installations safe even when a SQLite connection does
-- not have foreign-key enforcement enabled.
CREATE TRIGGER cleanup_glossary_entry_children AFTER DELETE ON glossary_entries BEGIN
  DELETE FROM glossary_aliases WHERE entry_id = OLD.id;
  DELETE FROM glossary_sections WHERE entry_id = OLD.id;
  DELETE FROM glossary_occurrences WHERE entry_id = OLD.id;
END;

CREATE TRIGGER cleanup_note_glossary_data AFTER DELETE ON notes BEGIN
  DELETE FROM glossary_occurrences WHERE note_id = OLD.id;
  UPDATE glossary_entries
  SET source_note_id = NULL, source_block_id = NULL
  WHERE source_note_id = OLD.id;
END;

CREATE TRIGGER cleanup_folder_glossary_entries AFTER DELETE ON note_folders BEGIN
  DELETE FROM glossary_entries WHERE scope_folder_id = OLD.id;
END;
