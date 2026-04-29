import test from 'node:test';
import assert from 'node:assert';
import { newDb, DataType } from 'pg-mem';

interface BalanceRow {
  user_id: string;
  net_balance: number;
}

test('Integration: computeGroupBalances, settlements, and soft-deletes via isolated exact query execution', async () => {
  const db = newDb();

  // Register ROUND function for pg-mem
  db.public.registerFunction({
    name: 'round',
    args: [DataType.float, DataType.integer],
    returns: DataType.float,
    implementation: (num: number, prec: number) => {
      const factor = Math.pow(10, prec);
      return Math.round(num * factor) / factor;
    }
  });

  // Create schema
  db.public.none(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, upi_id TEXT);
    CREATE TABLE groups (id TEXT PRIMARY KEY);
    CREATE TABLE group_members (user_id TEXT, group_id TEXT, status TEXT);
    CREATE TABLE expenses (id TEXT PRIMARY KEY, group_id TEXT, paid_by TEXT, amount NUMERIC, deleted_at TEXT);
    CREATE TABLE expense_splits (expense_id TEXT, user_id TEXT, share NUMERIC);
    CREATE TABLE settlements (id TEXT PRIMARY KEY, group_id TEXT, from_user TEXT, to_user TEXT, amount NUMERIC, status TEXT);
  `);

  // Seed data
  db.public.none(`
    INSERT INTO users VALUES ('u1', 'User 1', 'u1@test', null), ('u2', 'User 2', 'u2@test', null), ('u3', 'User 3', 'u3@test', null);
    INSERT INTO groups VALUES ('g1');
    INSERT INTO group_members VALUES ('u1', 'g1', 'accepted'), ('u2', 'g1', 'accepted'), ('u3', 'g1', 'pending');

    -- U1 paid 300, split equal (100 each for u1, u2, u3)
    INSERT INTO expenses VALUES ('e1', 'g1', 'u1', 300, null);
    INSERT INTO expense_splits VALUES ('e1', 'u1', 100), ('e1', 'u2', 100), ('e1', 'u3', 100);
  `);

  const EXACT_APP_QUERY = `
     WITH member_ids AS (
       SELECT u.id, u.name, u.email, u.upi_id
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = 'g1' AND gm.status = 'accepted'
     ),
     paid AS (
       SELECT paid_by AS user_id, SUM(amount) AS total_paid
       FROM expenses
       WHERE group_id = 'g1' AND deleted_at IS NULL
       GROUP BY paid_by
     ),
     owed AS (
       SELECT es.user_id, SUM(es.share) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = 'g1' AND e.deleted_at IS NULL
       GROUP BY es.user_id
     ),
     confirmed_sent AS (
       SELECT from_user AS user_id, SUM(amount) AS total_sent
       FROM settlements
       WHERE group_id = 'g1' AND status = 'confirmed'
       GROUP BY from_user
     ),
     confirmed_received AS (
       SELECT to_user AS user_id, SUM(amount) AS total_received
       FROM settlements
       WHERE group_id = 'g1' AND status = 'confirmed'
       GROUP BY to_user
     )
     SELECT
       m.id AS user_id,
       m.name,
       m.email,
       m.upi_id,
       ROUND(
         COALESCE(p.total_paid, 0)
         - COALESCE(o.total_owed, 0)
         - COALESCE(cr.total_received, 0)
         + COALESCE(cs.total_sent, 0),
         2
       )::float AS net_balance
     FROM member_ids m
     LEFT JOIN paid p ON p.user_id = m.id
     LEFT JOIN owed o ON o.user_id = m.id
     LEFT JOIN confirmed_sent cs ON cs.user_id = m.id
     LEFT JOIN confirmed_received cr ON cr.user_id = m.id
     ORDER BY m.name
  `;

  // Step 1: Initial state
  let balances = db.public.many(EXACT_APP_QUERY) as BalanceRow[];

  // Pending user U3 is completely ignored
  assert.strictEqual(balances.find((b) => b.user_id === 'u3'), undefined);

  // U1 net balance = paid (300) - owed (100) = 200
  assert.strictEqual(balances.find((b) => b.user_id === 'u1')?.net_balance, 200);

  // U2 net balance = paid (0) - owed (100) = -100
  assert.strictEqual(balances.find((b) => b.user_id === 'u2')?.net_balance, -100);

  // Step 2: Add a pending settlement
  db.public.none(`
    INSERT INTO settlements VALUES ('s1', 'g1', 'u2', 'u1', 50, 'pending');
  `);
  balances = db.public.many(EXACT_APP_QUERY) as BalanceRow[];
  // Balances unchanged because settlement is pending
  assert.strictEqual(balances.find((b) => b.user_id === 'u1')?.net_balance, 200);
  assert.strictEqual(balances.find((b) => b.user_id === 'u2')?.net_balance, -100);

  // Step 3: Confirm settlement
  db.public.none(`UPDATE settlements SET status = 'confirmed' WHERE id = 's1'`);
  balances = db.public.many(EXACT_APP_QUERY) as BalanceRow[];
  // U1 gets 50 -> net 150
  assert.strictEqual(balances.find((b) => b.user_id === 'u1')?.net_balance, 150);
  // U2 sends 50 -> net -50
  assert.strictEqual(balances.find((b) => b.user_id === 'u2')?.net_balance, -50);

  // Step 4: Soft delete expense
  db.public.none(`UPDATE expenses SET deleted_at = 'now' WHERE id = 'e1'`);
  balances = db.public.many(EXACT_APP_QUERY) as BalanceRow[];
  // Since expense is gone, balances only reflect the confirmed settlement
  // U1: received 50 -> net -50
  assert.strictEqual(balances.find((b) => b.user_id === 'u1')?.net_balance, -50);
  // U2: sent 50 -> net +50
  assert.strictEqual(balances.find((b) => b.user_id === 'u2')?.net_balance, 50);
});
