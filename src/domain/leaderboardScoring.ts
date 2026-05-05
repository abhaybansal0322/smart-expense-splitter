// ─────────────── Leaderboard Scoring ───────────────
// Pure function that computes normalized scores and rankings from raw leaderboard data.
// No I/O, no database access.

import { LeaderboardBaseRow, GroupLeaderboardEntry } from './types';
export type { LeaderboardBaseRow, GroupLeaderboardEntry } from './types';

/**
 * Compute normalized scores (1–100) and assign ranks.
 * Score formula: total_paid + settled_paid * 1.25 + settleups_confirmed * 25
 * Normalized to [1, 100]; if all scores equal, everyone gets 100.
 */
export function rankLeaderboardRows(rows: LeaderboardBaseRow[]): GroupLeaderboardEntry[] {
  if (rows.length === 0) return [];

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

  const rawScores = withRaw.map((r) => r.rawScore);
  const maxRaw = Math.max(...rawScores);
  const minRaw = Math.min(...rawScores);
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
