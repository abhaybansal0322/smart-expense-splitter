import { query, withTransaction } from '@/lib/db';
import { UserBalance, SettlementTransaction } from '@/lib/types';
import { minimizeTransactions } from '@/domain/balanceCalculator';
import { logActivity } from './activityService';
import { isUserInGroup } from './groupService';

export { minimizeTransactions } from '@/domain/balanceCalculator';

export async function computeGroupBalances(groupId: string): Promise<UserBalance[]> {
  const { rows } = await query<UserBalance>(
    `WITH member_ids AS (
       SELECT u.id, u.name, u.email
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND gm.status = 'accepted'
     ),
     paid AS (
       SELECT paid_by AS user_id, SUM(amount) AS total_paid
       FROM expenses
       WHERE group_id = $1 AND deleted_at IS NULL
       GROUP BY paid_by
     ),
     owed AS (
       SELECT es.user_id, SUM(es.share) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = $1 AND e.deleted_at IS NULL
       GROUP BY es.user_id
     ),
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
     ORDER BY m.name`,
    [groupId]
  );
  return rows;
}

export async function getSettlementPlan(groupId: string): Promise<SettlementTransaction[]> {
  const balances = await computeGroupBalances(groupId);
  return minimizeTransactions(balances);
}

export async function createSettlement(
  groupId: string,
  fromUser: string,
  toUser: string,
  amount: number
): Promise<string> {
  if (fromUser === toUser) {
    throw new Error('Payer and receiver must be different users');
  }

  const [payerIsMember, receiverIsMember] = await Promise.all([
    isUserInGroup(groupId, fromUser),
    isUserInGroup(groupId, toUser),
  ]);

  if (!payerIsMember || !receiverIsMember) {
    throw new Error('Both users must be accepted members of this group');
  }

  const pendingDuplicate = await query(
    `SELECT 1 FROM settlements
     WHERE group_id = $1 AND from_user = $2 AND to_user = $3 AND status = 'pending'
     LIMIT 1`,
    [groupId, fromUser, toUser]
  );

  if (pendingDuplicate.rowCount && pendingDuplicate.rowCount > 0) {
    throw new Error('A payment request is already waiting for this receiver');
  }

  const result = await query<{ id: string }>(
    `INSERT INTO settlements (group_id, from_user, to_user, amount, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id`,
    [groupId, fromUser, toUser, amount]
  );

  const settlementId = result.rows[0].id;

  await logActivity({
    userId: fromUser,
    groupId: groupId,
    action: 'SETTLEMENT_CREATED',
    entityType: 'settlement',
    entityId: settlementId,
    metadata: { amount, fromUser, toUser }
  });

  return settlementId;
}

export async function respondToSettlement(
  settlementId: string,
  userId: string,
  action: 'confirm' | 'reject'
): Promise<void> {
  await withTransaction(async (client) => {
    const check = await client.query<{
      id: string;
      status: string;
      to_user: string;
    }>(
      `SELECT id, status, to_user FROM settlements WHERE id = $1 FOR UPDATE`,
      [settlementId]
    );

    if (check.rowCount === 0) throw new Error('Settlement not found');
    if (check.rows[0].status !== 'pending') throw new Error('Settlement is not pending');
    if (check.rows[0].to_user !== userId) {
      throw new Error('Forbidden: Only the receiver can respond to this payment');
    }

    if (action === 'confirm') {
      await client.query(
        `UPDATE settlements SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
        [settlementId]
      );
    } else {
      await client.query(
        `UPDATE settlements SET status = 'cancelled' WHERE id = $1`,
        [settlementId]
      );
    }
  });
}

export async function getSettlementsForUser(userId: string) {
  const { rows } = await query(
    `SELECT s.id, s.group_id, s.from_user, s.to_user, s.amount::float, s.status,
            s.created_at, s.confirmed_at,
            fu.name AS from_name, tu.name AS to_name,
            g.name AS group_name
     FROM settlements s
     JOIN users fu ON fu.id = s.from_user
     JOIN users tu ON tu.id = s.to_user
     JOIN groups g ON g.id = s.group_id
     WHERE s.from_user = $1 OR s.to_user = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return rows;
}
