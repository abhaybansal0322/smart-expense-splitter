import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboardAnalytics,
  buildGlobalSummary,
  buildUpcomingDues,
} from './dashboardInsightsService';

test('buildDashboardAnalytics groups expenses by category, payer, member, date, and month', () => {
  const analytics = buildDashboardAnalytics([
    {
      id: 'expense-1',
      amount: 1200,
      category: 'Food',
      created_at: '2026-05-01T10:15:00.000Z',
      paid_by_name: 'Anubhav',
      group_name: 'Goa',
      splits: [
        { user_name: 'Anubhav', share: 600 },
        { user_name: 'Rahul', share: 600 },
      ],
    },
    {
      id: 'expense-2',
      amount: 800,
      category: '',
      created_at: '2026-05-02T10:15:00.000Z',
      paid_by_name: 'Rahul',
      group_name: 'Goa',
      splits: [
        { user_name: 'Anubhav', share: 300 },
        { user_name: 'Rahul', share: 500 },
      ],
    },
  ]);

  assert.deepEqual(analytics.byCategory.map((row) => [row.label, row.amount]), [
    ['Food', 1200],
    ['Uncategorized', 800],
  ]);
  assert.deepEqual(analytics.byPayer.map((row) => [row.label, row.amount]), [
    ['Anubhav', 1200],
    ['Rahul', 800],
  ]);
  assert.deepEqual(analytics.byMember.map((row) => [row.label, row.amount]), [
    ['Rahul', 1100],
    ['Anubhav', 900],
  ]);
  assert.deepEqual(analytics.byDate.map((row) => [row.label, row.amount]), [
    ['1 May', 1200],
    ['2 May', 800],
  ]);
  assert.deepEqual(analytics.byMonth.map((row) => [row.label, row.amount]), [
    ['May 2026', 2000],
  ]);
});

test('buildGlobalSummary totals user balances and identifies the biggest active group', () => {
  const summary = buildGlobalSummary({
    groups: [
      { id: 'g1', name: 'Flat', total_expenses: 4000, pending_settlements: 2 },
      { id: 'g2', name: 'Trip', total_expenses: 9200, pending_settlements: 1 },
    ],
    balances: [
      { group_id: 'g1', net_balance: -750 },
      { group_id: 'g2', net_balance: 1200 },
      { group_id: 'g3', net_balance: -100 },
    ],
    pendingToConfirm: 2,
    pendingAwaitingOthers: 1,
  });

  assert.equal(summary.totalYouOwe, 850);
  assert.equal(summary.totalOwedToYou, 1200);
  assert.equal(summary.pendingConfirmations, 3);
  assert.deepEqual(summary.biggestActiveGroup, {
    id: 'g2',
    name: 'Trip',
    totalExpenses: 9200,
  });
});

test('buildUpcomingDues derives direction and age from pending settlements', () => {
  const dues = buildUpcomingDues(
    [
      {
        id: 's1',
        group_id: 'g1',
        group_name: 'Goa',
        from_user: 'rahul',
        from_name: 'Rahul',
        to_user: 'me',
        to_name: 'Anubhav',
        amount: 850,
        created_at: '2026-05-08T00:00:00.000Z',
      },
      {
        id: 's2',
        group_id: 'g1',
        group_name: 'Goa',
        from_user: 'me',
        from_name: 'Anubhav',
        to_user: 'Priya',
        to_name: 'Priya',
        amount: 300,
        created_at: '2026-05-12T00:00:00.000Z',
      },
    ],
    'me',
    new Date('2026-05-13T00:00:00.000Z')
  );

  assert.deepEqual(dues.map((due) => ({
    id: due.id,
    direction: due.direction,
    personName: due.personName,
    daysPending: due.daysPending,
  })), [
    { id: 's1', direction: 'incoming', personName: 'Rahul', daysPending: 5 },
    { id: 's2', direction: 'outgoing', personName: 'Priya', daysPending: 1 },
  ]);
});
