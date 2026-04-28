import { PoolClient } from '@neondatabase/serverless';
import { query, withTransaction } from '@/lib/db';
import { logActivity } from '@/services/activityService';
import {
  CreateExpensePayload,
  ExpenseWithDetails,
  SplitType,
} from '@/lib/types';

// ─────────────── Split Calculators ───────────────

function computeEqualSplit(
  amount: number,
  participants: string[]
): Record<string, number> {
  const count = participants.length;
  const base = Math.floor((amount * 100) / count) / 100;
  const remainder = parseFloat((amount - base * count).toFixed(2));
  const shares: Record<string, number> = {};
  participants.forEach((uid, i) => {
    shares[uid] = i === 0 ? parseFloat((base + remainder).toFixed(2)) : base;
  });
  return shares;
}

function computeExactSplit(
  amount: number,
  exactAmounts: Record<string, number>
): Record<string, number> {
  const total = Object.values(exactAmounts).reduce((s, v) => s + v, 0);
  if (Math.abs(total - amount) > 0.01) {
    throw new Error(
      `Exact amounts (${total}) do not sum to expense amount (${amount})`
    );
  }
  return exactAmounts;
}

function computePercentageSplit(
  amount: number,
  percentages: Record<string, number>
): Record<string, number> {
  const total = Object.values(percentages).reduce((s, v) => s + v, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${total}`);
  }
  const shares: Record<string, number> = {};
  const uids = Object.keys(percentages);
  let allocated = 0;
  uids.forEach((uid, i) => {
    if (i === uids.length - 1) {
      shares[uid] = parseFloat((amount - allocated).toFixed(2));
    } else {
      const s = parseFloat(((amount * percentages[uid]) / 100).toFixed(2));
      shares[uid] = s;
      allocated += s;
    }
  });
  return shares;
}

function computeExcludeSplit(
  amount: number,
  participants: string[],
  excludedUsers: string[]
): Record<string, number> {
  const included = participants.filter((uid) => !excludedUsers.includes(uid));
  if (included.length === 0) {
    throw new Error('All participants are excluded — cannot split expense');
  }
  return computeEqualSplit(amount, included);
}

export function computeSplits(payload: CreateExpensePayload): Record<string, number> {
  const { amount, split_type, participants, exact_amounts, percentages, excluded_users } =
    payload;

  switch (split_type) {
    case 'equal':
      return computeEqualSplit(amount, participants);
    case 'exact':
      if (!exact_amounts) throw new Error('exact_amounts required for split_type=exact');
      return computeExactSplit(amount, exact_amounts);
    case 'percentage':
      if (!percentages) throw new Error('percentages required for split_type=percentage');
      return computePercentageSplit(amount, percentages);
    case 'exclude':
      return computeExcludeSplit(amount, participants, excluded_users ?? []);
    default:
      throw new Error(`Unknown split_type: ${split_type}`);
  }
}

// ─────────────── Service Functions ───────────────

export async function createExpense(payload: CreateExpensePayload, userId?: string): Promise<string> {
  const shares = computeSplits(payload);

  return withTransaction(async (client: PoolClient) => {
    // Verify payer is a member of the group
    const memberCheck = await client.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [payload.group_id, payload.paid_by]
    );
    if (memberCheck.rowCount === 0) {
      throw new Error('Payer is not a member of this group');
    }

    // Insert expense
    const expResult = await client.query<{ id: string }>(
      `INSERT INTO expenses (group_id, paid_by, amount, description, category, split_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [payload.group_id, payload.paid_by, payload.amount, payload.description, payload.category, payload.split_type]
    );
    const expenseId = expResult.rows[0].id;

    // Insert splits
    for (const [userId, share] of Object.entries(shares)) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, share)
         VALUES ($1, $2, $3)
         ON CONFLICT (expense_id, user_id) DO UPDATE SET share = EXCLUDED.share`,
        [expenseId, userId, share]
      );
    }

    if (userId) {
      await logActivity({
        userId,
        groupId: payload.group_id,
        action: 'EXPENSE_CREATED',
        entityType: 'expense',
        entityId: expenseId,
        metadata: {
          amount: payload.amount,
          description: payload.description
        }
      }, client);
    }

    return expenseId;
  });
}

export async function getExpensesByGroup(groupId: string): Promise<ExpenseWithDetails[]> {
  const { rows } = await query<ExpenseWithDetails>(
    `SELECT
       e.id, e.group_id, e.paid_by, e.amount::float, e.description, e.split_type, e.created_at,
       u.name AS paid_by_name,
       json_agg(
         json_build_object(
           'id', es.id,
           'expense_id', es.expense_id,
           'user_id', es.user_id,
           'share', es.share::float,
           'user_name', su.name
         )
         ORDER BY su.name
       ) AS splits
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     JOIN expense_splits es ON es.expense_id = e.id
     JOIN users su ON su.id = es.user_id
     WHERE e.group_id = $1
     GROUP BY e.id, u.name
     ORDER BY e.created_at DESC`,
    [groupId]
  );
  return rows;
}

export async function deleteExpense(expenseId: string, groupId: string, userId?: string): Promise<void> {
  await withTransaction(async (client) => {
    // Ensuring expense belongs to group before deleting, and capture info for logging
    const check = await client.query(`SELECT amount, description FROM expenses WHERE id = $1 AND group_id = $2`, [expenseId, groupId]);
    if (check.rowCount === 0) throw new Error('Expense not found');
    const { amount, description } = check.rows[0];
    
    await client.query(`DELETE FROM expenses WHERE id = $1`, [expenseId]);

    if (userId) {
      await logActivity({
        userId,
        groupId,
        action: 'EXPENSE_DELETED',
        entityType: 'expense',
        entityId: expenseId,
        metadata: { amount, description }
      }, client);
    }
  });
}

export async function updateExpense(payload: import('@/lib/types').UpdateExpensePayload, userId?: string): Promise<void> {
  return withTransaction(async (client: PoolClient) => {
    // check existence
    const { rows } = await client.query(`SELECT * FROM expenses WHERE id = $1 AND group_id = $2`, [payload.expense_id, payload.group_id]);
    if (rows.length === 0) throw new Error('Expense not found');
    const existing = rows[0];

    const updatedAmount = payload.amount ?? existing.amount;
    const updatedDesc = payload.description ?? existing.description;
    const updatedCat = payload.category !== undefined ? payload.category : existing.category;
    const updatedSplitType = payload.split_type ?? existing.split_type;

    await client.query(
      `UPDATE expenses SET amount = $1, description = $2, category = $3, split_type = $4 WHERE id = $5`,
      [updatedAmount, updatedDesc, updatedCat, updatedSplitType, payload.expense_id]
    );

    if (payload.participants || payload.split_type || payload.amount || payload.exact_amounts || payload.percentages || payload.excluded_users) {
      // recompute splits
      const fullPayload = {
        group_id: existing.group_id,
        paid_by: existing.paid_by,
        amount: updatedAmount,
        description: updatedDesc,
        category: updatedCat,
        split_type: updatedSplitType,
        participants: payload.participants ?? [],
        exact_amounts: payload.exact_amounts,
        percentages: payload.percentages,
        excluded_users: payload.excluded_users,
      };
      
      // If participants not provided, fetch current participants
      if (!payload.participants) {
         const { rows: splits } = await client.query(`SELECT user_id FROM expense_splits WHERE expense_id = $1`, [payload.expense_id]);
         fullPayload.participants = splits.map(r => r.user_id);
      }

      const shares = computeSplits(fullPayload as any);

      await client.query(`DELETE FROM expense_splits WHERE expense_id = $1`, [payload.expense_id]);
      
      for (const [userId, share] of Object.entries(shares)) {
        await client.query(
          `INSERT INTO expense_splits (expense_id, user_id, share) VALUES ($1, $2, $3)`,
          [payload.expense_id, userId, share]
        );
      }
    }

    if (userId) {
      await logActivity({
        userId,
        groupId: existing.group_id,
        action: 'EXPENSE_UPDATED',
        entityType: 'expense',
        entityId: payload.expense_id,
        metadata: {
          old_amount: existing.amount,
          new_amount: updatedAmount
        }
      }, client);
    }
  });
}
