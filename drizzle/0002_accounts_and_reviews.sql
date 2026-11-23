CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS app_users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('citizen','officer','admin')),
 district_ids TEXT NOT NULL DEFAULT '[]', enabled INTEGER NOT NULL DEFAULT 1,
 must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES app_users(id), expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON app_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS incident_records (
 id TEXT PRIMARY KEY, district_id TEXT NOT NULL, submitter_id TEXT NOT NULL,
 payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS incidents_district ON incident_records(district_id);
CREATE INDEX IF NOT EXISTS incidents_submitter ON incident_records(submitter_id);
CREATE TABLE IF NOT EXISTS incident_events (
 id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES incident_records(id), actor_id TEXT NOT NULL,
 actor_name TEXT NOT NULL, action TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS incident_event_report ON incident_events(report_id);
CREATE TABLE IF NOT EXISTS app_notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, report_id TEXT,
 created_at TEXT NOT NULL, read_at TEXT
);
CREATE INDEX IF NOT EXISTS notification_user ON app_notifications(user_id);
CREATE TABLE IF NOT EXISTS evidence_files (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, district_id TEXT NOT NULL, object_key TEXT NOT NULL,
 content_type TEXT NOT NULL, original_name TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, district_id TEXT,
 action TEXT NOT NULL, target_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_district ON audit_events(district_id);

CREATE TABLE IF NOT EXISTS user_preferences (user_id TEXT PRIMARY KEY, scenario TEXT NOT NULL);
