// ─────────────── DB Row Types ───────────────
export interface User {
  id: string;
  name: string;
  email: string;
  upi_id?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  join_code?: string;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  group_id: string;
  status: 'pending' | 'accepted';
  joined_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;
  amount: number;
  description: string;
  split_type: SplitType;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share: number; // actual amount this user owes
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_url: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface ExpenseSpotifyTrack {
  id?: string;
  expense_id?: string;
  spotify_track_id: string;
  spotify_url: string;
  name: string;
  artist: string;
  album_name?: string;
  album_image_url?: string;
  created_at?: string;
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  status: SettlementStatus;
  created_at: string;
  confirmed_at?: string;
}

// ─────────────── Enums ───────────────
export type SplitType = 'equal' | 'exact' | 'percentage' | 'exclude' | 'adjustment';
export type SettlementStatus = 'pending' | 'confirmed' | 'cancelled';

// ─────────────── API Payload Types ───────────────
export interface CreateGroupPayload {
  name: string;
  description?: string;
  memberEmails?: string[];
}

export interface CreateGroupResponse {
  groupId: string;
  joinCode: string;
}

export interface CreateExpensePayload {
  group_id: string;
  paid_by: string; // user_id
  amount: number;
  description: string;
  category?: string;
  split_type: SplitType;
  participants: string[]; // user_ids
  // For 'exact' splits: map of user_id -> amount
  exact_amounts?: Record<string, number>;
  // For 'percentage' splits: map of user_id -> percentage
  percentages?: Record<string, number>;
  // For 'exclude' splits: user_ids to exclude
  excluded_users?: string[];
  // For 'adjustment' splits: map of user_id -> extra amount
  adjustments?: Record<string, number>;
  spotify_track?: ExpenseSpotifyTrack | null;
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {
  expense_id: string;
}

// ─────────────── Computed/View Types ───────────────
export interface UserBalance {
  user_id: string;
  name: string;
  email: string;
  upi_id?: string;
  net_balance: number; // positive = owed money, negative = owes money
}

export interface SettlementTransaction {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  to_upi_id?: string;
  amount: number;
  upi_link?: string;
}

export interface SettlementRecord {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  status: SettlementStatus;
  upi_reference?: string;
  created_at: string;
  confirmed_at?: string;
  from_name: string;
  to_name: string;
  to_upi_id?: string;
}

export interface GroupWithDetails extends Group {
  members: User[];
  member_count: number;
  total_expenses: number;
  pending_settlements: number;
}

export interface GroupLeaderboardEntry {
  user_id: string;
  name: string;
  email: string;
  total_paid: number;
  settled_paid: number;
  settleups_confirmed: number;
  score: number;
  rank: number;
}

export interface GroupInvitation {
  group_id: string;
  group_name: string;
  group_description?: string;
  invited_at: string;
  invited_by_name?: string;
  accepted_member_count: number;
}

export interface ExpenseWithDetails extends Expense {
  paid_by_name: string;
  splits: Array<ExpenseSplit & { user_name: string }>;
  attachments: ExpenseAttachment[];
  spotify_track?: ExpenseSpotifyTrack | null;
}

export interface Activity {
  id: string;
  action: 'EXPENSE_CREATED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED' | 'SETTLEMENT_CREATED';
  entity_type: 'expense' | 'settlement';
  metadata: Record<string, unknown>;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
}
