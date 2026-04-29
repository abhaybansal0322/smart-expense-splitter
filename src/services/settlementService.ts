import { query } from '@/lib/db';
import { UserBalance, SettlementTransaction } from '@/lib/types';

/**
 * Computes each member's net balance for a group.
 * net_balance > 0 → others owe them
 * net_balance < 0 → they owe others
 */
export async function computeGroupBalances(groupId: string): Promise<UserBalance[]> {
  const { rows } = await query<UserBalance>(
    `SELECT
       u.id AS user_id,
       u.name,
       u.email,
       u.upi_id,
       ROUND(
         (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE group_id = $1 AND paid_by = u.id AND deleted_at IS NULL)
         - (SELECT COALESCE(SUM(es.share), 0) FROM expense_splits es JOIN expenses e ON e.id = es.expense_id WHERE e.group_id = $1 AND es.user_id = u.id AND e.deleted_at IS NULL)
         - (SELECT COALESCE(SUM(amount), 0) FROM settlements WHERE group_id = $1 AND to_user = u.id AND status = 'confirmed')
         + (SELECT COALESCE(SUM(amount), 0) FROM settlements WHERE group_id = $1 AND from_user = u.id AND status = 'confirmed'),
         2
       )::float AS net_balance
     FROM users u
     JOIN group_members gm ON gm.user_id = u.id
     WHERE gm.group_id = $1 AND gm.status = 'accepted'
     ORDER BY u.name`,
    [groupId]
  );
  return rows;
}

/**
 * Greedy debt-minimization algorithm.
 * Given net balances, finds the minimum set of transactions to settle all debts.
 *
 * Time complexity: O(n²) — acceptable for group sizes up to ~50 members.
 */
export function minimizeTransactions(balances: UserBalance[]): SettlementTransaction[] {
  // Build mutable balance list, filter out zero balances
  const debtors: Array<{ user_id: string; name: string; upi_id?: string; amount: number }> = [];
  const creditors: Array<{ user_id: string; name: string; upi_id?: string; amount: number }> = [];

  for (const b of balances) {
    const rounded = parseFloat(b.net_balance.toFixed(2));
    if (rounded < -0.005) {
      debtors.push({ user_id: b.user_id, name: b.name, upi_id: b.upi_id, amount: Math.abs(rounded) });
    } else if (rounded > 0.005) {
      creditors.push({ user_id: b.user_id, name: b.name, upi_id: b.upi_id, amount: rounded });
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
      to_upi_id: creditor.upi_id,
      amount,
      upi_link: creditor.upi_id
        ? buildUpiLink(creditor.upi_id, creditor.name, amount)
        : undefined,
    });

    creditor.amount = parseFloat((creditor.amount - amount).toFixed(2));
    debtor.amount = parseFloat((debtor.amount - amount).toFixed(2));

    if (creditor.amount < 0.005) i++;
    if (debtor.amount < 0.005) j++;
  }

  return transactions;
}

function buildUpiLink(upiId: string, name: string, amount: number): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
  });
  return `upi://pay?${params.toString()}`;
}

export async function getSettlementPlan(groupId: string): Promise<SettlementTransaction[]> {
  const balances = await computeGroupBalances(groupId);
  return minimizeTransactions(balances);
}
