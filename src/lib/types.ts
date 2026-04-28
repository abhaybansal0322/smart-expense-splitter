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
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  group_id: string;
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
export type SplitType = 'equal' | 'exact' | 'percentage' | 'exclude';
export type SettlementStatus = 'pending' | 'confirmed' | 'cancelled';

// ─────────────── API Payload Types ───────────────
export interface CreateGroupPayload {
  name: string;
  description?: string;
  memberEmails: string[];
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
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {
  expense_id: string;
}

export interface ConfirmSettlementPayload {
  settlement_id: string;
  upi_reference?: string;
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

export interface GroupWithDetails extends Group {
  members: User[];
  member_count: number;
  total_expenses: number;
  pending_settlements: number;
}

export interface ExpenseWithDetails extends Expense {
  paid_by_name: string;
  splits: Array<ExpenseSplit & { user_name: string }>;
}

export interface Activity {
  id: string;
  action: 'EXPENSE_CREATED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED' | 'SETTLEMENT_CREATED';
  entity_type: 'expense' | 'settlement';
  metadata: any;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
}

export interface PendingDue {
  expense_id: string;
  description: string;
  amount: number;
  share: number;
  paid_by_name: string;
  days_overdue: number;
  created_at: string;
}
