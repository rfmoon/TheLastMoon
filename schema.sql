CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_master INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);


CREATE TABLE IF NOT EXISTS payout_accounts (
  id INTEGER PRIMARY KEY,
  account TEXT NOT NULL UNIQUE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_by INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_name
  ON payout_accounts(account_name);


CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT '["dashboard:read"]',
  active INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys(active);
