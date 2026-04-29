import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense } from '@/services/expenseService';
import { isUserInGroup } from '@/services/groupService';
import { getAuthSession } from '@/lib/auth';
import { SplitType } from '@/lib/types';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const CreateExpenseSchema = z.object({
  group_id: z.string().uuid(),
  paid_by: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  split_type: z.enum(['equal', 'exact', 'percentage', 'exclude'] as [SplitType, ...SplitType[]]),
  participants: z.array(z.string().uuid()).min(1),
  exact_amounts: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  percentages: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  excluded_users: z.array(z.string().uuid()).optional(),
});

export async function POST(req: NextRequest) {
  const request_id = crypto.randomUUID();
  try {
    const body = await req.json();
    const parsed = CreateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('Expense validation failed', { request_id, validation_error: parsed.error.flatten() });
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isMember = await isUserInGroup(parsed.data.group_id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const expenseId = await createExpense(parsed.data, session.user.id);

    logger.info('Expense created', {
      request_id,
      user_id: session.user.id,
      group_id: parsed.data.group_id,
      expenseId,
      amount: parsed.data.amount
    });

    return NextResponse.json({ expenseId }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('POST /api/expenses error', { request_id }, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
