ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;
ALTER TABLE tasks ADD COLUMN recurrence_parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
