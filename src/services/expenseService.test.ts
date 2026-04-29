import test from 'node:test';
import assert from 'node:assert';
import { computeSplits } from './expenseService';
import { CreateExpensePayload } from '@/lib/types';

test('computeSplits - equal split', () => {
  const payload: CreateExpensePayload = {
    group_id: 'group1',
    paid_by: 'user1',
    amount: 100,
    description: 'Test',
    split_type: 'equal',
    participants: ['user1', 'user2', 'user3']
  };

  const splits = computeSplits(payload);
  assert.strictEqual(splits['user1'], 33.34);
  assert.strictEqual(splits['user2'], 33.33);
  assert.strictEqual(splits['user3'], 33.33);
});

test('computeSplits - exact split', () => {
  const payload: CreateExpensePayload = {
    group_id: 'group1',
    paid_by: 'user1',
    amount: 100,
    description: 'Test',
    split_type: 'exact',
    participants: ['user1', 'user2'],
    exact_amounts: {
      'user1': 40,
      'user2': 60
    }
  };

  const splits = computeSplits(payload);
  assert.strictEqual(splits['user1'], 40);
  assert.strictEqual(splits['user2'], 60);
});

test('computeSplits - exact split ledger rule throws', () => {
  const payload: CreateExpensePayload = {
    group_id: 'group1',
    paid_by: 'user1',
    amount: 100,
    description: 'Test',
    split_type: 'exact',
    participants: ['user1', 'user2'],
    exact_amounts: {
      'user1': 40,
      'user2': 50
    }
  };

  assert.throws(() => computeSplits(payload), /Ledger mismatch|do not sum/);
});

test('computeSplits - percentage split', () => {
  const payload: CreateExpensePayload = {
    group_id: 'group1',
    paid_by: 'user1',
    amount: 200,
    description: 'Test',
    split_type: 'percentage',
    participants: ['user1', 'user2', 'user3'],
    percentages: {
      'user1': 50,
      'user2': 25,
      'user3': 25
    }
  };

  const splits = computeSplits(payload);
  assert.strictEqual(splits['user1'], 100);
  assert.strictEqual(splits['user2'], 50);
  assert.strictEqual(splits['user3'], 50);
});

test('computeSplits - exclude split', () => {
  const payload: CreateExpensePayload = {
    group_id: 'group1',
    paid_by: 'user1',
    amount: 100,
    description: 'Test',
    split_type: 'exclude',
    participants: ['user1', 'user2', 'user3', 'user4'],
    excluded_users: ['user4']
  };

  const splits = computeSplits(payload);
  assert.strictEqual(splits['user1'], 33.34);
  assert.strictEqual(splits['user2'], 33.33);
  assert.strictEqual(splits['user3'], 33.33);
  assert.strictEqual(splits['user4'], undefined);
});
