import { db } from '@/db/client';
import { settlements } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';
import { UserBalance, SettlementTransaction } from '@/lib/types';
import { minimizeTransactions } from '@/domain/balanceCalculator';
import { eventBus, DomainEvent } from '@/lib/events';
import { GroupRepository } from '@/db/repositories/GroupRepository';
import { SettlementRepository } from '@/db/repositories/SettlementRepository';

export { minimizeTransactions } from '@/domain/balanceCalculator';

export async function computeGroupBalances(groupId: string): Promise<UserBalance[]> {
  const result = await db.execute(sql`
    WITH member_ids AS (
       SELECT u.id, u.name, u.email
       FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ${groupId} AND gm.status = 'accepted'
     ),
     paid AS (
       SELECT paid_by AS user_id, SUM(amount) AS total_paid
       FROM expenses
       WHERE group_id = ${groupId} AND deleted_at IS NULL
       GROUP BY paid_by
     ),
     owed AS (
       SELECT es.user_id, SUM(es.share) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = ${groupId} AND e.deleted_at IS NULL
       GROUP BY es.user_id
     ),
     confirmed_sent AS (
       SELECT from_user AS user_id, SUM(amount) AS total_sent
       FROM settlements
       WHERE group_id = ${groupId} AND status = 'confirmed'
       GROUP BY from_user
     ),
     confirmed_received AS (
       SELECT to_user AS user_id, SUM(amount) AS total_received
       FROM settlements
       WHERE group_id = ${groupId} AND status = 'confirmed'
       GROUP BY to_user
     )
     SELECT
       m.id AS user_id,
       m.name,
       m.email,
       ROUND(
         (COALESCE(p.total_paid, 0)
         - COALESCE(o.total_owed, 0)
         - COALESCE(cr.total_received, 0)
         + COALESCE(cs.total_sent, 0))::numeric,
         2
       )::float AS net_balance
     FROM member_ids m
     LEFT JOIN paid p ON p.user_id = m.id
     LEFT JOIN owed o ON o.user_id = m.id
     LEFT JOIN confirmed_sent cs ON cs.user_id = m.id
     LEFT JOIN confirmed_received cr ON cr.user_id = m.id
     ORDER BY m.name
  `);

  const rows = (result.rows || result) as any[];
  return rows as unknown as UserBalance[];
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
    GroupRepository.isUserInGroup(groupId, fromUser),
    GroupRepository.isUserInGroup(groupId, toUser),
  ]);

  if (!payerIsMember || !receiverIsMember) {
    throw new Error('Both users must be accepted members of this group');
  }

  const pendingDuplicate = await SettlementRepository.findPending(groupId, fromUser, toUser);

  if (pendingDuplicate) {
    throw new Error('A payment request is already waiting for this receiver');
  }

  const newSettlement = await SettlementRepository.create({
    groupId,
    fromUser,
    toUser,
    amount: amount.toString(),
    status: 'pending'
  });

  eventBus.emit(DomainEvent.SETTLEMENT_CREATED, {
    userId: fromUser,
    groupId: groupId,
    settlementId: newSettlement.id,
    amount,
    fromUser,
    toUser
  });

  return newSettlement.id;
}

export async function respondToSettlement(
  settlementId: string,
  userId: string,
  action: 'confirm' | 'reject'
): Promise<void> {
  await db.transaction(async (tx) => {
    const check = await tx.query.settlements.findFirst({
      where: (table, { eq }) => eq(table.id, settlementId)
    });

    if (!check) throw new Error('Settlement not found');
    if (check.status !== 'pending') throw new Error('Settlement is not pending');
    if (check.toUser !== userId) {
      throw new Error('Forbidden: Only the receiver can respond to this payment');
    }

    if (action === 'confirm') {
      await tx.update(settlements)
        .set({ status: 'confirmed', confirmedAt: new Date() })
        .where((table, { eq }) => eq(table.id, settlementId));

      eventBus.emit(DomainEvent.SETTLEMENT_CONFIRMED, {
        userId: userId,
        groupId: check.groupId,
        settlementId: check.id,
        amount: Number(check.amount),
        fromUser: check.fromUser,
        toUser: check.toUser,
        tx
      });
    } else {
      await tx.update(settlements)
        .set({ status: 'cancelled' })
        .where((table, { eq }) => eq(table.id, settlementId));
    }
  });
}

export async function getSettlementsForUser(userId: string) {
  const result = await SettlementRepository.findForUser(userId);

  return result.map(s => ({
    id: s.id,
    group_id: s.groupId,
    from_user: s.fromUser,
    to_user: s.toUser,
    amount: Number(s.amount),
    status: s.status,
    created_at: s.createdAt.toISOString(),
    confirmed_at: s.confirmedAt?.toISOString() || null,
    from_name: s.sender.name,
    to_name: s.receiver.name,
    group_name: s.group.name
  }));
}
