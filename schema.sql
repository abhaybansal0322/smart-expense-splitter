-- Smart Expense Splitter Database Schema
-- Run this against your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────── Users ───────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  avatar_url    TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─────────────── Groups ───────────────
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  join_code   VARCHAR(16) NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
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
    CREATE TYPE split_type AS ENUM ('equal', 'exact', 'percentage', 'exclude', 'adjustment');
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

-- Fun expense add-ons visible to all accepted group members.
CREATE TABLE IF NOT EXISTS expense_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0),
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_spotify_tracks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id       UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
  spotify_track_id VARCHAR(255) NOT NULL,
  spotify_url      TEXT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  artist           VARCHAR(255) NOT NULL,
  album_name       VARCHAR(255),
  album_image_url  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense ON expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_spotify_tracks_expense ON expense_spotify_tracks(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group      ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user  ON settlements(from_user);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user    ON settlements(to_user);
CREATE INDEX IF NOT EXISTS idx_settlements_status     ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_group    ON activity_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created  ON activity_logs(created_at DESC);


-- ─────────────── Seed Data (optional) ───────────────
-- INSERT INTO users (name, email, ) VALUES
--   ('Alice',   'alice@example.com'),
--   ('Bob',     'bob@example.com'),
--   ('Charlie', 'charlie@example.com');

--   ('Bob',     'bob@example.com'),
--   ('Charlie', 'charlie@example.com');

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'accepted';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_id ON expenses(id);
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_groups_id ON groups(id);

-- Stable join code for code-based group joining.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code VARCHAR(16);
ALTER TABLE groups ALTER COLUMN join_code TYPE VARCHAR(16);
WITH numbered_groups AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS position
  FROM groups
  WHERE join_code IS NULL
)
UPDATE groups
SET join_code = upper(substr(replace(groups.id::text, '-', ''), 1, 6)) || lpad(numbered_groups.position::text, 4, '0')
FROM numbered_groups
WHERE groups.id = numbered_groups.id;
ALTER TABLE groups ALTER COLUMN join_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_join_code ON groups(join_code);

-- Standardize password storage for databases created before password_hash existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE TABLE IF NOT EXISTS expense_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size_bytes    INTEGER NOT NULL CHECK (size_bytes > 0),
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_spotify_tracks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id       UUID NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE CASCADE,
  spotify_track_id VARCHAR(255) NOT NULL,
  spotify_url      TEXT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  artist           VARCHAR(255) NOT NULL,
  album_name       VARCHAR(255),
  album_image_url  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense ON expense_attachments(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_spotify_tracks_expense ON expense_spotify_tracks(expense_id);

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
        UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL;
        ALTER TABLE users DROP COLUMN password;
    END IF;
END $$;
