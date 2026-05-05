import test from 'node:test';
import assert from 'node:assert/strict';
import { rankLeaderboardRows } from './leaderboardService';

test('rankLeaderboardRows scores paid expenses and confirmed settle ups', () => {
  const rows = rankLeaderboardRows([
    {
      user_id: 'u1',
      name: 'Asha',
      email: 'asha@example.com',
      total_paid: 800,
      settled_paid: 100,
      settleups_confirmed: 1,
    },
    {
      user_id: 'u2',
      name: 'Bala',
      email: 'bala@example.com',
      total_paid: 650,
      settled_paid: 300,
      settleups_confirmed: 3,
    },
    {
      user_id: 'u3',
      name: 'Chirag',
      email: 'chirag@example.com',
      total_paid: 1000,
      settled_paid: 0,
      settleups_confirmed: 0,
    },
  ]);

  assert.deepEqual(
    rows.map((row) => ({ user_id: row.user_id, rank: row.rank, score: row.score })),
    [
      { user_id: 'u2', rank: 1, score: 100 },
      { user_id: 'u3', rank: 2, score: 34 },
      { user_id: 'u1', rank: 3, score: 1 },
    ]
  );
});

test('rankLeaderboardRows uses stable rank ordering for tied scores', () => {
  const rows = rankLeaderboardRows([
    {
      user_id: 'u1',
      name: 'Asha',
      email: 'asha@example.com',
      total_paid: 100,
      settled_paid: 0,
      settleups_confirmed: 0,
    },
    {
      user_id: 'u2',
      name: 'Bala',
      email: 'bala@example.com',
      total_paid: 100,
      settled_paid: 0,
      settleups_confirmed: 0,
    },
  ]);

  assert.deepEqual(rows.map((row) => ({ user_id: row.user_id, rank: row.rank })), [
    { user_id: 'u1', rank: 1 },
    { user_id: 'u2', rank: 2 },
  ]);
});
