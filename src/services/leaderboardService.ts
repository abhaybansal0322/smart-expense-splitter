import { db } from '@/db/client';
import { GroupLeaderboardEntry } from '@/lib/types';
import { rankLeaderboardRows, LeaderboardBaseRow } from '@/domain/leaderboardScoring';
import { sql } from 'drizzle-orm';

export { rankLeaderboardRows } from '@/domain/leaderboardScoring';
export type { LeaderboardBaseRow } from '@/domain/leaderboardScoring';

export async function getGroupLeaderboard(groupId: string): Promise<GroupLeaderboardEntry[]> {
  const result = await db.execute(sql`
    SELECT
       u.id AS user_id,
       u.name,
       u.email,
       COALESCE(expense_totals.total_paid, 0)::float AS total_paid,
       COALESCE(settlement_totals.settled_paid, 0)::float AS settled_paid,
       COALESCE(settlement_totals.settleups_confirmed, 0)::int AS settleups_confirmed
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN (
       SELECT paid_by AS user_id, SUM(amount) AS total_paid
       FROM expenses
       WHERE group_id = ${groupId} AND deleted_at IS NULL
       GROUP BY paid_by
     ) expense_totals ON expense_totals.user_id = u.id
     LEFT JOIN (
       SELECT from_user AS user_id, SUM(amount) AS settled_paid, COUNT(*) AS settleups_confirmed
       FROM settlements
       WHERE group_id = ${groupId} AND status = 'confirmed'
       GROUP BY from_user
     ) settlement_totals ON settlement_totals.user_id = u.id
     WHERE gm.group_id = ${groupId} AND gm.status = 'accepted'
     ORDER BY u.name
  `);

  return rankLeaderboardRows(result.rows as unknown as LeaderboardBaseRow[]);
}
