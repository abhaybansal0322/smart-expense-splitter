import test from 'node:test';
import assert from 'node:assert';
import { minimizeTransactions } from './settlementService';

test('minimizeTransactions - CASE 1: A pays 1000, split with B -> B owes 500', () => {
    const balances = [
        { user_id: 'A', name: 'A', email: 'A', net_balance: 500 },
        { user_id: 'B', name: 'B', email: 'B', net_balance: -500 }
    ];
    const txns = minimizeTransactions(balances);
    assert.strictEqual(txns.length, 1);
    assert.strictEqual(txns[0].from_user_id, 'B');
    assert.strictEqual(txns[0].to_user_id, 'A');
    assert.strictEqual(txns[0].amount, 500);
});

test('minimizeTransactions - CASE 2: B pays 500 -> balances = 0', () => {
    const balances = [
        { user_id: 'A', name: 'A', email: 'A', net_balance: 0 },
        { user_id: 'B', name: 'B', email: 'B', net_balance: 0 }
    ];
    const txns = minimizeTransactions(balances);
    assert.strictEqual(txns.length, 0);
});

test('minimizeTransactions - Complex case with multiple users', () => {
    const balances = [
        { user_id: 'A', name: 'A', email: 'A', net_balance: 150.55 },
        { user_id: 'B', name: 'B', email: 'B', net_balance: -100.25 },
        { user_id: 'C', name: 'C', email: 'C', net_balance: -50.30 }
    ];
    const txns = minimizeTransactions(balances);
    assert.strictEqual(txns.length, 2);
    // Amounts must match the debts, summing to the creditor's balance.
    const totalAmount = txns.reduce((sum, txn) => sum + txn.amount, 0);
    assert.strictEqual(totalAmount, 150.55);
});

test('minimizeTransactions - partial splits handled without floating point bugs', () => {
    const balances = [
        { user_id: 'A', name: 'A', email: 'A', net_balance: 33.34 },
        { user_id: 'B', name: 'B', email: 'B', net_balance: -16.67 },
        { user_id: 'C', name: 'C', email: 'C', net_balance: -16.67 }
    ];
    const txns = minimizeTransactions(balances);
    assert.strictEqual(txns.length, 2);
    assert.strictEqual(txns[0].amount, 16.67);
    assert.strictEqual(txns[1].amount, 16.67);
});
