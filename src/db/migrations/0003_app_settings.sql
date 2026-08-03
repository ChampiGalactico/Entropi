-- Generic key/value store for app-level settings (language, active theme, etc.)
-- Avoids localStorage; all persistent state lives in SQLite per architecture rules.

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
