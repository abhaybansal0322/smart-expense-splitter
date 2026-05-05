// ─────────────── Balance Calculator ───────────────
// Greedy debt-minimization algorithm.
// Given net balances, finds the minimum set of transactions to settle all debts.
// Pure function — no I/O, no database access.
//
// Time complexity: O(n²) — acceptable for group sizes up to ~50 members.

import { UserBalance, SettlementTransaction } from './types';

export function minimizeTransactions(balances: UserBalance[]): SettlementTransaction[] {
  const debtors: Array<{ user_id: string; name: string; amount: number }> = [];
  const creditors: Array<{ user_id: string; name: string; amount: number }> = [];

  for (const b of balances) {
    const rounded = parseFloat(b.net_balance.toFixed(2));
    if (rounded < -0.005) {
      debtors.push({ user_id: b.user_id, name: b.name, amount: Math.abs(rounded) });
    } else if (rounded > 0.005) {
      creditors.push({ user_id: b.user_id, name: b.name, amount: rounded });
    }
  }

  const transactions: SettlementTransaction[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = parseFloat(Math.min(creditor.amount, debtor.amount).toFixed(2));

    transactions.push({
      from_user_id: debtor.user_id,
      from_name: debtor.name,
      to_user_id: creditor.user_id,
      to_name: creditor.name,
      amount,
    });

    creditor.amount = parseFloat((creditor.amount - amount).toFixed(2));
    debtor.amount = parseFloat((debtor.amount - amount).toFixed(2));

    if (creditor.amount < 0.005) i++;
    if (debtor.amount < 0.005) j++;
  }

  return transactions;
}
