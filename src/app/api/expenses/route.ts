import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createExpense } from '@/services/expenseService';
import { isUserInGroup } from '@/services/groupService';
import { withAuth } from '@/lib/apiHandler';
import { SplitType } from '@/lib/types';

const CreateExpenseSchema = z.object({
  group_id: z.string().uuid(),
  paid_by: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  split_type: z.enum(['equal', 'exact', 'percentage', 'exclude', 'adjustment'] as [SplitType, ...SplitType[]]),
  participants: z.array(z.string().uuid()).min(1),
  exact_amounts: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  percentages: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  excluded_users: z.array(z.string().uuid()).optional(),
  adjustments: z.record(z.string().uuid(), z.number().nonnegative()).optional(),
  spotify_track: z.object({
    spotify_track_id: z.string().min(1),
    spotify_url: z.string().url(),
    name: z.string().min(1).max(255),
    artist: z.string().min(1).max(255),
    album_name: z.string().max(255).optional(),
    album_image_url: z.string().url().optional(),
  }).optional(),
});

export const POST = withAuth(async ({ req, userId }) => {
  const body = await req.json();
  const parsed = CreateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isMember = await isUserInGroup(parsed.data.group_id, userId);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const expenseId = await createExpense(parsed.data, userId);
  return NextResponse.json({ expenseId }, { status: 201 });
}, 'POST /api/expenses');
