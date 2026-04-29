-- Smart Expense Splitter Database Schema
-- Run this against your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────── Users ───────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(320) NOT NULL UNIQUE,
  password      VARCHAR(255),
  password_hash VARCHAR(255),
  avatar_url    TEXT,
  upi_id        TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─────────────── Groups ───────────────
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────── Group Members ───────────────
CREATE TABLE IF NOT EXISTS group_members (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role      VARCHAR(50) DEFAULT 'member',
  status    VARCHAR(50) DEFAULT 'accepted',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- ─────────────── Expenses ───────────────
DO $$ BEGIN
    CREATE TYPE split_type AS ENUM ('equal', 'exact', 'percentage', 'exclude');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  paid_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(500) NOT NULL,
  category    VARCHAR(100),
  split_type  split_type NOT NULL DEFAULT 'equal',
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────── Expense Splits ───────────────
CREATE TABLE IF NOT EXISTS expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  share       NUMERIC(12,2) NOT NULL CHECK (share >= 0),
  UNIQUE (expense_id, user_id)
);

-- ─────────────── Settlements ───────────────
DO $$ BEGIN
    CREATE TYPE settlement_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS settlements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_user       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status        settlement_status NOT NULL DEFAULT 'pending',
  upi_reference VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at  TIMESTAMPTZ,
  CHECK (from_user <> to_user)
);

-- ─────────────── Activity Logs ───────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────── Indexes ───────────────
CREATE INDEX IF NOT EXISTS idx_group_members_group    ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user     ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group         ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by       ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user    ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group      ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user  ON settlements(from_user);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user    ON settlements(to_user);
CREATE INDEX IF NOT EXISTS idx_settlements_status     ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_group    ON activity_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created  ON activity_logs(created_at DESC);


-- ─────────────── Seed Data (optional) ───────────────
-- INSERT INTO users (name, email, upi_id) VALUES
--   ('Alice',   'alice@example.com',   'alice@upi'),
--   ('Bob',     'bob@example.com',     'bob@upi'),
--   ('Charlie', 'charlie@example.com', 'charlie@upi');

--   ('Bob',     'bob@example.com',     'bob@upi'),
--   ('Charlie', 'charlie@example.com', 'charlie@upi');

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'accepted';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_id ON expenses(id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_groups_id ON groups(id);
