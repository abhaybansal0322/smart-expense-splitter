import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateExpense, deleteExpense } from '@/services/expenseService';
import { getAuthSession } from '@/lib/auth';
import { ExpenseRepository } from '@/db/repositories/ExpenseRepository';
import { GroupRepository } from '@/db/repositories/GroupRepository';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const UpdateExpenseSchema = z.object({
  group_id: z.string().uuid(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).max(500).optional(),
  category: z.string().max(100).optional(),
  split_type: z.enum(['equal', 'exact', 'percentage', 'exclude', 'adjustment']).optional(),
  participants: z.array(z.string().uuid()).min(1).optional(),
  exact_amounts: z.record(z.string().uuid(), z.number()).optional(),
  percentages: z.record(z.string().uuid(), z.number()).optional(),
  excluded_users: z.array(z.string().uuid()).optional(),
  adjustments: z.record(z.string().uuid(), z.number()).optional(),
  spotify_track: z.object({
    spotify_track_id: z.string().min(1),
    spotify_url: z.string().url(),
    name: z.string().min(1).max(255),
    artist: z.string().min(1).max(255),
    album_name: z.string().max(255).optional(),
    album_image_url: z.string().url().optional(),
  }).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const request_id = crypto.randomUUID();
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const expense = await ExpenseRepository.findById(id);
    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    
    const isMember = await GroupRepository.isUserInGroup(expense.groupId, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteExpense(id, expense.groupId, session.user.id);

    logger.info('Expense deleted', { request_id, user_id: session.user.id, group_id: expense.groupId, expenseId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/expenses/[id] error', { request_id }, error);
    const message = errorMessage(error, 'Failed to delete expense');
    if (message === 'Expense not found') {
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
    const isMember = await GroupRepository.isUserInGroup(payload.group_id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await updateExpense({ expense_id: id, ...payload }, session.user.id);

    logger.info('Expense updated', { request_id, user_id: session.user.id, group_id: payload.group_id, expenseId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('PATCH /api/expenses/[id] error', { request_id }, error);
    const message = errorMessage(error, 'Failed to update expense');
    if (message === 'Expense not found') {
       return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    if (
      message.includes('Exact amounts') ||
      message.includes('Percentages') ||
      message.includes('Ledger mismatch') ||
      message.includes('participants') ||
      message.includes('members')
    ) {
       return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}
