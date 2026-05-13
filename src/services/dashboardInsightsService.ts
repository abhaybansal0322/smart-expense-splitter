import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  Activity,
  DashboardActivity,
  DashboardAnalytics,
  DashboardChartDatum,
  DashboardGlobalSummary,
  DashboardInsights,
  DashboardNotification,
  DashboardUpcomingDue,
  GroupWithDetails,
} from '@/lib/types';
import { getGroupsForUser, getPendingGroupInvitations } from './groupService';
import { computeGroupBalances } from './settlementService';

type InsightExpenseRow = {
  id: string;
  amount: number;
  category?: string | null;
  created_at: string;
  paid_by_name: string;
  group_name: string;
  splits: Array<{
    user_name: string;
    share: number;
  }>;
};

type UserGroupBalance = {
  group_id: string;
  net_balance: number;
};

type PendingSettlementRow = {
  id: string;
  group_id: string;
  group_name: string;
  from_user: string;
  from_name: string;
  to_user: string;
  to_name: string;
  amount: number;
  created_at: string;
};

function addAmount(map: Map<string, DashboardChartDatum>, label: string, amount: number) {
  const current = map.get(label) ?? { label, amount: 0, count: 0 };
  current.amount = Number((current.amount + amount).toFixed(2));
  current.count += 1;
  map.set(label, current);
}

function topRows(map: Map<string, DashboardChartDatum>, limit = 8) {
  return [...map.values()]
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function formatDay(dateValue: string) {
  return new Date(dateValue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatMonth(dateValue: string) {
  return new Date(dateValue).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function buildDashboardAnalytics(expenses: InsightExpenseRow[]): DashboardAnalytics {
  const byCategory = new Map<string, DashboardChartDatum>();
  const byPayer = new Map<string, DashboardChartDatum>();
  const byDate = new Map<string, DashboardChartDatum>();
  const byMember = new Map<string, DashboardChartDatum>();
  const byMonth = new Map<string, DashboardChartDatum>();

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    addAmount(byCategory, expense.category?.trim() || 'Uncategorized', amount);
    addAmount(byPayer, expense.paid_by_name, amount);
    addAmount(byDate, formatDay(expense.created_at), amount);
    addAmount(byMonth, formatMonth(expense.created_at), amount);

    for (const split of expense.splits) {
      addAmount(byMember, split.user_name, Number(split.share));
    }
  }

  return {
    byCategory: topRows(byCategory),
    byPayer: topRows(byPayer),
    byDate: [...byDate.values()].slice(-14),
    byMember: topRows(byMember),
    byMonth: [...byMonth.values()].slice(-12),
  };
}

export function buildGlobalSummary(params: {
  groups: Array<Pick<GroupWithDetails, 'id' | 'name' | 'total_expenses' | 'pending_settlements'>>;
  balances: UserGroupBalance[];
  pendingToConfirm: number;
  pendingAwaitingOthers: number;
}): DashboardGlobalSummary {
  const totalYouOwe = params.balances
    .filter((balance) => balance.net_balance < 0)
    .reduce((sum, balance) => sum + Math.abs(balance.net_balance), 0);
  const totalOwedToYou = params.balances
    .filter((balance) => balance.net_balance > 0)
    .reduce((sum, balance) => sum + balance.net_balance, 0);
  const biggestGroup = [...params.groups].sort((a, b) => b.total_expenses - a.total_expenses)[0];

  return {
    totalYouOwe: Number(totalYouOwe.toFixed(2)),
    totalOwedToYou: Number(totalOwedToYou.toFixed(2)),
    pendingConfirmations: params.pendingToConfirm + params.pendingAwaitingOthers,
    pendingToConfirm: params.pendingToConfirm,
    pendingAwaitingOthers: params.pendingAwaitingOthers,
    biggestActiveGroup: biggestGroup
      ? {
          id: biggestGroup.id,
          name: biggestGroup.name,
          totalExpenses: biggestGroup.total_expenses,
        }
      : null,
  };
}

export function buildUpcomingDues(
  settlements: PendingSettlementRow[],
  userId: string,
  now = new Date()
): DashboardUpcomingDue[] {
  return settlements.map((settlement) => {
    const isIncoming = settlement.to_user === userId;
    const createdAt = new Date(settlement.created_at);
    const daysPending = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));

    return {
      id: settlement.id,
      group_id: settlement.group_id,
      group_name: settlement.group_name,
      personName: isIncoming ? settlement.from_name : settlement.to_name,
      amount: Number(settlement.amount),
      direction: isIncoming ? 'incoming' : 'outgoing',
      daysPending,
      created_at: settlement.created_at,
    };
  });
}

function notificationFromActivity(activity: DashboardActivity): DashboardNotification | null {
  const amount = Number(activity.metadata.amount ?? 0);
  const description = String(activity.metadata.description ?? 'expense');

  switch (activity.action) {
    case 'EXPENSE_CREATED':
      return {
        id: `activity-${activity.id}`,
        kind: 'expense',
        title: `${activity.user.name} added an expense`,
        detail: `${description}${amount > 0 ? ` · ₹${amount.toLocaleString('en-IN')}` : ''}`,
        group_id: activity.group_id,
        group_name: activity.group_name,
        created_at: activity.created_at,
      };
    case 'SETTLEMENT_CREATED':
      return {
        id: `activity-${activity.id}`,
        kind: 'settlement',
        title: `${activity.user.name} recorded a payment`,
        detail: `${activity.group_name}${amount > 0 ? ` · ₹${amount.toLocaleString('en-IN')}` : ''}`,
        group_id: activity.group_id,
        group_name: activity.group_name,
        created_at: activity.created_at,
      };
    case 'SETTLEMENT_CONFIRMED':
      return {
        id: `activity-${activity.id}`,
        kind: 'settlement',
        title: 'Settlement confirmed',
        detail: `${activity.group_name}${amount > 0 ? ` · ₹${amount.toLocaleString('en-IN')}` : ''}`,
        group_id: activity.group_id,
        group_name: activity.group_name,
        created_at: activity.created_at,
      };
    case 'MEMBER_JOINED':
      return {
        id: `activity-${activity.id}`,
        kind: 'member',
        title: `${activity.user.name} joined ${activity.group_name}`,
        detail: 'New member activity',
        group_id: activity.group_id,
        group_name: activity.group_name,
        created_at: activity.created_at,
      };
    default:
      return null;
  }
}

async function getInsightExpenses(userId: string): Promise<InsightExpenseRow[]> {
  const expensesResult = await db.execute(sql`
    SELECT
      e.id,
      e.amount::float AS amount,
      e.category,
      e.created_at,
      payer.name AS paid_by_name,
      g.name AS group_name
    FROM expenses e
    JOIN groups g ON g.id = e.group_id
    JOIN users payer ON payer.id = e.paid_by
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE gm.user_id = ${userId}
      AND gm.status = 'accepted'
      AND e.deleted_at IS NULL
    ORDER BY e.created_at ASC
  `);

  const splitResult = await db.execute(sql`
    SELECT
      es.expense_id,
      es.share::float AS share,
      u.name AS user_name
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    JOIN users u ON u.id = es.user_id
    JOIN group_members gm ON gm.group_id = e.group_id
    WHERE gm.user_id = ${userId}
      AND gm.status = 'accepted'
      AND e.deleted_at IS NULL
  `);

  const splitsByExpense = new Map<string, InsightExpenseRow['splits']>();
  for (const row of splitResult.rows as Array<{ expense_id: string; share: number; user_name: string }>) {
    const splits = splitsByExpense.get(row.expense_id) ?? [];
    splits.push({ user_name: row.user_name, share: Number(row.share) });
    splitsByExpense.set(row.expense_id, splits);
  }

  return (expensesResult.rows as Array<Omit<InsightExpenseRow, 'splits'>>).map((row) => ({
    ...row,
    amount: Number(row.amount),
    created_at: new Date(row.created_at).toISOString(),
    splits: splitsByExpense.get(row.id) ?? [],
  }));
}

async function getPendingSettlementRows(userId: string): Promise<PendingSettlementRow[]> {
  const result = await db.execute(sql`
    SELECT
      s.id,
      s.group_id,
      g.name AS group_name,
      s.from_user,
      sender.name AS from_name,
      s.to_user,
      receiver.name AS to_name,
      s.amount::float AS amount,
      s.created_at
    FROM settlements s
    JOIN groups g ON g.id = s.group_id
    JOIN users sender ON sender.id = s.from_user
    JOIN users receiver ON receiver.id = s.to_user
    WHERE s.status = 'pending'
      AND (s.from_user = ${userId} OR s.to_user = ${userId})
    ORDER BY s.created_at ASC
  `);

  return (result.rows as PendingSettlementRow[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
    created_at: new Date(row.created_at).toISOString(),
  }));
}

async function getRecentActivity(userId: string): Promise<DashboardActivity[]> {
  const result = await db.execute(sql`
    SELECT
      al.id,
      al.group_id,
      g.name AS group_name,
      al.action,
      al.entity_type,
      al.metadata,
      al.created_at,
      u.id AS user_id,
      u.name AS user_name
    FROM activity_logs al
    JOIN groups g ON g.id = al.group_id
    JOIN users u ON u.id = al.user_id
    JOIN group_members gm ON gm.group_id = al.group_id
    WHERE gm.user_id = ${userId}
      AND gm.status = 'accepted'
    ORDER BY al.created_at DESC
    LIMIT 20
  `);

  return (result.rows as Array<{
    id: string;
    group_id: string;
    group_name: string;
    action: Activity['action'];
    entity_type: Activity['entity_type'];
    metadata: Record<string, unknown> | null;
    created_at: Date | string;
    user_id: string;
    user_name: string;
  }>).map((row) => ({
    id: row.id,
    group_id: row.group_id,
    group_name: row.group_name,
    action: row.action,
    entity_type: row.entity_type,
    metadata: row.metadata ?? {},
    created_at: new Date(row.created_at).toISOString(),
    user: {
      id: row.user_id,
      name: row.user_name,
    },
  }));
}

export async function getDashboardInsights(userId: string): Promise<DashboardInsights> {
  const [groups, invitations, expenses, pendingSettlements, recentActivity] = await Promise.all([
    getGroupsForUser(userId),
    getPendingGroupInvitations(userId),
    getInsightExpenses(userId),
    getPendingSettlementRows(userId),
    getRecentActivity(userId),
  ]);

  const balances = await Promise.all(
    groups.map(async (group) => {
      const groupBalances = await computeGroupBalances(group.id);
      const currentUserBalance = groupBalances.find((balance) => balance.user_id === userId);
      return {
        group_id: group.id,
        net_balance: currentUserBalance?.net_balance ?? 0,
      };
    })
  );

  const pendingToConfirm = pendingSettlements.filter((settlement) => settlement.to_user === userId).length;
  const pendingAwaitingOthers = pendingSettlements.filter((settlement) => settlement.from_user === userId).length;
  const invitationNotifications: DashboardNotification[] = invitations.map((invitation) => ({
    id: `invitation-${invitation.group_id}`,
    kind: 'invitation',
    title: `Invitation to ${invitation.group_name}`,
    detail: `${invitation.invited_by_name ?? 'Someone'} invited you`,
    group_id: invitation.group_id,
    group_name: invitation.group_name,
    created_at: invitation.invited_at,
  }));
  const activityNotifications = recentActivity
    .map(notificationFromActivity)
    .filter((notification): notification is DashboardNotification => notification !== null);

  return {
    summary: buildGlobalSummary({
      groups,
      balances,
      pendingToConfirm,
      pendingAwaitingOthers,
    }),
    analytics: buildDashboardAnalytics(expenses),
    upcomingDues: buildUpcomingDues(pendingSettlements, userId),
    notifications: [...invitationNotifications, ...activityNotifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12),
    recentActivity,
  };
}
