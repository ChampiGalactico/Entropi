ALTER TABLE learning_topics RENAME TO learning_topics_legacy;

CREATE TABLE learning_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'started', 'in_progress', 'completed')),
  notes_content TEXT,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO learning_topics (id, title, description, priority, status, notes_content, archived, created_at)
SELECT id, title, description, priority, status, notes_content, 0, created_at
FROM learning_topics_legacy;

DROP TABLE learning_topics_legacy;

CREATE INDEX idx_learning_topics_active_status ON learning_topics(archived, status);
