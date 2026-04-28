import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense } from '@/services/expenseService';
import { SplitType } from '@/lib/types';

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
  try {
    const body = await req.json();
    const parsed = CreateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const expenseId = await createExpense(parsed.data);
    return NextResponse.json({ expenseId }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/expenses error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
