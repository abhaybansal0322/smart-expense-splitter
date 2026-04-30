import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import {
  createUniqueJoinCode,
  GroupJoinError,
  joinGroupByCodeWithClient,
  normalizeJoinCode,
} from './groupJoinService';

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function bindParams(text: string, params?: unknown[]): string {
  if (!params) return text;
  return params.reduce(
    (sql, param, index) => sql.replaceAll(`$${index + 1}`, sqlValue(param)),
    text
  );
}

function createClient() {
  const db = newDb();
  db.public.none(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL UNIQUE
    );
    CREATE TABLE group_members (
      user_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'accepted',
      PRIMARY KEY (user_id, group_id)
    );

    INSERT INTO users VALUES
      ('u1', 'User One', 'one@example.com'),
      ('u2', 'User Two', 'two@example.com'),
      ('u3', 'User Three', 'three@example.com');
    INSERT INTO groups VALUES
      ('g1', 'Trip', 'ABC123'),
      ('g2', 'House', 'USED01');
    INSERT INTO group_members VALUES
      ('u1', 'g1', 'accepted'),
      ('u2', 'g2', 'pending');
  `);

  return {
    db,
    client: {
      query: async (text: string, params?: unknown[]) => {
        const result = db.public.query(bindParams(text, params));
        return { rows: result.rows, rowCount: result.rowCount };
      },
    },
  };
}

test('normalizeJoinCode accepts forgiving user input', () => {
  assert.equal(normalizeJoinCode(' abc-123 '), 'ABC123');
  assert.equal(normalizeJoinCode('ab c 123'), 'ABC123');
});

test('createUniqueJoinCode retries generated collisions', async () => {
  const { client } = createClient();
  const candidates = ['USED01', 'FREE02'];

  const code = await createUniqueJoinCode(client, () => candidates.shift() ?? 'NEVER');

  assert.equal(code, 'FREE02');
});

test('joinGroupByCodeWithClient inserts a new accepted membership', async () => {
  const { db, client } = createClient();

  const result = await joinGroupByCodeWithClient(client, 'abc-123', 'u2');

  assert.deepEqual(result, { groupId: 'g1' });
  const rows = db.public.many(`SELECT status FROM group_members WHERE user_id = 'u2' AND group_id = 'g1'`);
  assert.deepEqual(rows, [{ status: 'accepted' }]);
});

test('joinGroupByCodeWithClient accepts an existing pending invitation', async () => {
  const { db, client } = createClient();

  const result = await joinGroupByCodeWithClient(client, 'used01', 'u2');

  assert.deepEqual(result, { groupId: 'g2' });
  const rows = db.public.many(`SELECT status FROM group_members WHERE user_id = 'u2' AND group_id = 'g2'`);
  assert.deepEqual(rows, [{ status: 'accepted' }]);
});

test('joinGroupByCodeWithClient rejects invalid codes and duplicate memberships', async () => {
  const { client } = createClient();

  await assert.rejects(
    () => joinGroupByCodeWithClient(client, 'missing', 'u2'),
    (error) => error instanceof GroupJoinError && error.code === 'invalid_code'
  );

  await assert.rejects(
    () => joinGroupByCodeWithClient(client, 'ABC123', 'u1'),
    (error) => error instanceof GroupJoinError && error.code === 'already_member'
  );
});
