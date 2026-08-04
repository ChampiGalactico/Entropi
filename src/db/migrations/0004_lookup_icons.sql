-- All configurable reference tables support the same Solar Icon field.
ALTER TABLE event_types ADD COLUMN icon TEXT;
ALTER TABLE task_types ADD COLUMN icon TEXT;
