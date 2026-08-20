CREATE TABLE bookmark_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  scope_folder_id INTEGER REFERENCES note_folders(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_bookmark_collections_scope_name
  ON bookmark_collections(name COLLATE NOCASE, COALESCE(scope_folder_id, 0));
CREATE INDEX idx_bookmark_collections_scope ON bookmark_collections(scope_folder_id);

CREATE TABLE note_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES bookmark_collections(id) ON DELETE CASCADE,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  block_type TEXT NOT NULL,
  block_snapshot TEXT NOT NULL,
  plain_text TEXT NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_id, note_id, block_id)
);

CREATE INDEX idx_note_bookmarks_collection ON note_bookmarks(collection_id, created_at DESC);
CREATE INDEX idx_note_bookmarks_note ON note_bookmarks(note_id, block_id);

CREATE TRIGGER cleanup_bookmark_collection_children AFTER DELETE ON bookmark_collections BEGIN
  DELETE FROM note_bookmarks WHERE collection_id = OLD.id;
END;

CREATE TRIGGER cleanup_note_bookmarks AFTER DELETE ON notes BEGIN
  DELETE FROM note_bookmarks WHERE note_id = OLD.id;
END;

CREATE TRIGGER cleanup_folder_bookmark_collections AFTER DELETE ON note_folders BEGIN
  DELETE FROM bookmark_collections WHERE scope_folder_id = OLD.id;
END;
