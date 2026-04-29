import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateExpense, deleteExpense } from '@/services/expenseService';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const UpdateExpenseSchema = z.object({
  group_id: z.string().uuid(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).max(500).optional(),
  category: z.string().max(100).optional(),
  split_type: z.enum(['equal', 'exact', 'percentage', 'exclude']).optional(),
  participants: z.array(z.string().uuid()).min(1).optional(),
  exact_amounts: z.record(z.string().uuid(), z.number()).optional(),
  percentages: z.record(z.string().uuid(), z.number()).optional(),
  excluded_users: z.array(z.string().uuid()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const request_id = crypto.randomUUID();
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch expense and verify group membership in ONE round trip
    const { rows } = await query<any>(
      `SELECT e.group_id, 
              CASE WHEN gm.user_id IS NOT NULL THEN true ELSE false END AS is_member
       FROM expenses e
       LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = $2
       WHERE e.id = $1`,
      [id, session.user.id]
    );

    if (rows.length === 0) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    
    const expense = rows[0];
    if (!expense.is_member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteExpense(id, expense.group_id, session.user.id);

    logger.info('Expense deleted', { request_id, user_id: session.user.id, group_id: expense.group_id, expenseId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('DELETE /api/expenses/[id] error', { request_id }, error);
    if (error.message === 'Expense not found') {
       return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const request_id = crypto.randomUUID();
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = UpdateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('Update expense validation failed', { request_id, validation_error: parsed.error.flatten() });
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;

    // Verify user is in group
    const { rowCount } = await query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [payload.group_id, session.user.id]
    );
    if (rowCount === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await updateExpense({ expense_id: id, ...payload }, session.user.id);

    logger.info('Expense updated', { request_id, user_id: session.user.id, group_id: payload.group_id, expenseId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('PATCH /api/expenses/[id] error', { request_id }, error);
    if (error.message === 'Expense not found') {
       return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    if (error.message?.includes('Exact amounts') || error.message?.includes('Percentages') || error.message?.includes('Ledger mismatch')) {
       return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}
