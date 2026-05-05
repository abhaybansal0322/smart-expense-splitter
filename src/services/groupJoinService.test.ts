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
  let sql = text;
  for (let i = 0; i < params.length; i++) {
    sql = sql.replaceAll(`$${i + 1}`, sqlValue(params[i]));
  }
  return sql;
}

function extractDrizzleParams(where: any): any[] {
  if (!where) return [];
  const params: any[] = [];
  const visited = new Set();

  function walk(obj: any) {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
    visited.add(obj);

    if (obj.constructor?.name === 'Param' && 'value' in obj) {
      params.push(obj.value);
      return;
    }

    const chunks = obj.query || obj.queryChunks || obj.terms;
    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        walk(chunk);
      }
    } else if (obj.left || obj.right) {
      walk(obj.left);
      walk(obj.right);
    }
  }

  walk(where);
  return params;
}

function extractDrizzleParam(where: any): any {
  const params = extractDrizzleParams(where);
  return params.length > 0 ? params[0] : null;
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

  const client = {
    query: {
      groups: {
        findFirst: async ({ where }: any) => {
          // Simplified mock: find by joinCode
          const val = extractDrizzleParam(where);
          const sql = bindParams('SELECT id FROM groups WHERE join_code = $1', [val]);
          const result = db.public.query(sql);
          return result.rows[0] ?? null;
        }
      },
      groupMembers: {
        findFirst: async ({ where }: any) => {
          // Simplified mock: find by groupId and userId
          const params = extractDrizzleParams(where);
          const sql = bindParams('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', params);
          const result = db.public.query(sql);
          return result.rows[0] ?? null;
        }
      }
    },
    insert: (table: any) => ({
      values: (data: any) => ({
        onConflictDoUpdate: () => {
          const sql = bindParams('INSERT INTO group_members (user_id, group_id, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, group_id) DO UPDATE SET status = EXCLUDED.status', [data.userId, data.groupId, data.status]);
          db.public.none(sql);
          return Promise.resolve();
        }
      })
    })
  };

  return { db, client };
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
