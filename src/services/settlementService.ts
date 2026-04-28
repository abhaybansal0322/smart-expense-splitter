import { query } from '@/lib/db';
import { UserBalance, SettlementTransaction } from '@/lib/types';

/**
 * Computes each member's net balance for a group.
 * net_balance > 0 → others owe them
 * net_balance < 0 → they owe others
 */
export async function computeGroupBalances(groupId: string): Promise<UserBalance[]> {
  const { rows } = await query<UserBalance>(
    `WITH member_ids AS (
       SELECT u.id, u.name, u.email, u.upi_id
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = $1
     ),
     -- Amount each user paid in this group
     paid AS (
       SELECT paid_by AS user_id, SUM(amount) AS total_paid
       FROM expenses
       WHERE group_id = $1
       GROUP BY paid_by
     ),
     -- Amount each user owes across all splits in this group
     owed AS (
       SELECT es.user_id, SUM(es.share) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = $1
       GROUP BY es.user_id
     ),
     -- Already confirmed settlements reduce balances
     confirmed_sent AS (
       SELECT from_user AS user_id, SUM(amount) AS total_sent
       FROM settlements
       WHERE group_id = $1 AND status = 'confirmed'
       GROUP BY from_user
     ),
     confirmed_received AS (
       SELECT to_user AS user_id, SUM(amount) AS total_received
       FROM settlements
       WHERE group_id = $1 AND status = 'confirmed'
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
         + COALESCE(cr.total_received, 0)
         - COALESCE(cs.total_sent, 0),
         2
       )::float AS net_balance
     FROM member_ids m
     LEFT JOIN paid p ON p.user_id = m.id
     LEFT JOIN owed o ON o.user_id = m.id
     LEFT JOIN confirmed_sent cs ON cs.user_id = m.id
     LEFT JOIN confirmed_received cr ON cr.user_id = m.id
     ORDER BY m.name`,
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
