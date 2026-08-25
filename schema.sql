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


CREATE TABLE IF NOT EXISTS event_scatter_rows (
  id TEXT PRIMARY KEY,
  event_date TEXT NOT NULL,
  row_order INTEGER NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  screenshot TEXT NOT NULL DEFAULT '',
  x_bet TEXT NOT NULL DEFAULT '',
  check_nominal TEXT NOT NULL DEFAULT '',
  prize_status INTEGER NOT NULL DEFAULT 0,
  scanner_status TEXT NOT NULL DEFAULT 'PENDING',
  updated_at INTEGER NOT NULL,
  updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_event_scatter_date_order
  ON event_scatter_rows(event_date, row_order);


CREATE TABLE IF NOT EXISTS xpay_transactions (
  id INTEGER PRIMARY KEY,
  signature TEXT NOT NULL UNIQUE,
  transaction_id TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  payment_sec INTEGER NOT NULL DEFAULT 0,
  settlement_raw TEXT NOT NULL DEFAULT '',
  record_value REAL NOT NULL DEFAULT 0,
  record_fee REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  member TEXT NOT NULL DEFAULT '',
  partner_id TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_xpay_transactions_date
  ON xpay_transactions(payment_date);

CREATE INDEX IF NOT EXISTS idx_xpay_transactions_payment
  ON xpay_transactions(payment_date, payment_sec);

CREATE INDEX IF NOT EXISTS idx_xpay_transactions_member
  ON xpay_transactions(member);


-- Xpay Checker V27 full Cloudflare port
CREATE TABLE IF NOT EXISTS xpay_upload_history (
  batch_id TEXT PRIMARY KEY,
  filename TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  total_records INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT '',
  uploaded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS xpay_settlement_files (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL DEFAULT '',
  settlement_date TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT '',
  uploaded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS xpay_settlement_details (
  id INTEGER PRIMARY KEY,
  settlement_file_id INTEGER NOT NULL,
  partner_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  settlement_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xpay_comparison_results (
  id INTEGER PRIMARY KEY,
  settlement_date TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  expected_amount REAL NOT NULL DEFAULT 0,
  actual_amount REAL NOT NULL DEFAULT 0,
  difference REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '',
  transaction_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(settlement_date, partner_id)
);

CREATE TABLE IF NOT EXISTS xpay_disbursements (
  id INTEGER PRIMARY KEY,
  batch_id TEXT NOT NULL DEFAULT '',
  transaction_id TEXT NOT NULL DEFAULT '',
  date_disbursement TEXT NOT NULL,
  bank_code TEXT NOT NULL DEFAULT '',
  bank_no TEXT NOT NULL DEFAULT '',
  account_name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  ref_id TEXT NOT NULL UNIQUE,
  vendor_status TEXT NOT NULL DEFAULT 'pending',
  status_done INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS xpay_disbursement_logs (
  id INTEGER PRIMARY KEY,
  disbursement_id INTEGER NOT NULL,
  ref_id TEXT NOT NULL,
  batch_id TEXT NOT NULL DEFAULT '',
  action_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL DEFAULT '',
  changed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS xpay_disbursement_marks (
  id INTEGER PRIMARY KEY,
  disbursement_id INTEGER NOT NULL,
  ref_id TEXT NOT NULL,
  marked_by TEXT NOT NULL DEFAULT '',
  note TEXT,
  marked_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS xpay_balance_history (
  id INTEGER PRIMARY KEY,
  signature TEXT NOT NULL UNIQUE,
  batch_id TEXT NOT NULL,
  record_id TEXT NOT NULL DEFAULT '',
  date_created TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  credit REAL NOT NULL DEFAULT 0,
  debit REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT '',
  uploaded_at INTEGER NOT NULL
);


-- MEMO V32 — shared Cloudflare D1 database
CREATE TABLE IF NOT EXISTS memo_records (
  id INTEGER PRIMARY KEY,
  keyword TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  created_by INTEGER,
  updated_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_memo_records_deleted_updated
  ON memo_records(deleted, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_memo_records_updated
  ON memo_records(updated_at DESC);


-- V41 shared WD Bersih database
CREATE TABLE IF NOT EXISTS wd_bersih_names (
  match_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_text TEXT NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wd_bersih_updated
  ON wd_bersih_names(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wd_bersih_name
  ON wd_bersih_names(name);
