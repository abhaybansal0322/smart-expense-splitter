// ─────────────── Domain Types ───────────────
// Pure domain types that represent the core business concepts.
// No framework dependencies. No I/O.

// ─── Enums ───
export type SplitType = 'equal' | 'exact' | 'percentage' | 'exclude' | 'adjustment';
export type SettlementStatus = 'pending' | 'confirmed' | 'cancelled';

// ─── Core Entities ───
export interface UserBalance {
  user_id: string;
  name: string;
  email: string;
  net_balance: number; // positive = owed money, negative = owes money
}

export interface SettlementTransaction {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

// ─── Split Calculator Input ───
export interface SplitInput {
  amount: number;
  split_type: SplitType;
  participants: string[];
  exact_amounts?: Record<string, number>;
  percentages?: Record<string, number>;
  excluded_users?: string[];
  adjustments?: Record<string, number>;
}

// ─── Leaderboard ───
export interface LeaderboardBaseRow {
  user_id: string;
  name: string;
  email: string;
  total_paid: number;
  settled_paid: number;
  settleups_confirmed: number;
}

export interface GroupLeaderboardEntry extends LeaderboardBaseRow {
  score: number;
  rank: number;
}
