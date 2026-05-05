import { query } from '@/lib/db';
import { GroupLeaderboardEntry } from '@/lib/types';

export interface LeaderboardBaseRow {
  user_id: string;
  name: string;
  email: string;
  total_paid: number;
  settled_paid: number;
  settleups_confirmed: number;
}

export function rankLeaderboardRows(rows: LeaderboardBaseRow[]): GroupLeaderboardEntry[] {
  // Compute raw scores first
  const withRaw = rows.map((row) => ({
    ...row,
    total_paid: Number(row.total_paid) || 0,
    settled_paid: Number(row.settled_paid) || 0,
    settleups_confirmed: Number(row.settleups_confirmed) || 0,
    rawScore:
      (Number(row.total_paid) || 0) +
      (Number(row.settled_paid) || 0) * 1.25 +
      (Number(row.settleups_confirmed) || 0) * 25,
  }));

  const maxRaw = Math.max(...withRaw.map((r) => r.rawScore), 0);
  const minRaw = Math.min(...withRaw.map((r) => r.rawScore), 0);
  const range = maxRaw - minRaw;

  // Normalize to [1, 100]; if all scores are equal everyone gets 100
  const normalize = (raw: number): number => {
    if (range === 0) return 100;
    const normalized = 1 + ((raw - minRaw) / range) * 99;
    return Math.round(normalized * 100) / 100;
  };

  return withRaw
    .map(({ rawScore, ...row }) => ({
      ...row,
      score: normalize(rawScore),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

export async function getGroupLeaderboard(groupId: string): Promise<GroupLeaderboardEntry[]> {
  const { rows } = await query<LeaderboardBaseRow>(
    `SELECT
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
       WHERE group_id = $1 AND deleted_at IS NULL
       GROUP BY paid_by
     ) expense_totals ON expense_totals.user_id = u.id
     LEFT JOIN (
       SELECT from_user AS user_id, SUM(amount) AS settled_paid, COUNT(*) AS settleups_confirmed
       FROM settlements
       WHERE group_id = $1 AND status = 'confirmed'
       GROUP BY from_user
     ) settlement_totals ON settlement_totals.user_id = u.id
     WHERE gm.group_id = $1 AND gm.status = 'accepted'
     ORDER BY u.name`,
    [groupId]
  );

  return rankLeaderboardRows(rows);
}
