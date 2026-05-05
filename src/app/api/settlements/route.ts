import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/apiHandler';
import { 
  createSettlement, 
  respondToSettlement, 
  getSettlementsForUser 
} from '@/services/settlementService';

const ConfirmSchema = z.object({
  settlement_id: z.string().uuid(),
  action: z.enum(['confirm', 'reject']).default('confirm'),
});

const CreateSettlementSchema = z.object({
  group_id: z.string().uuid(),
  from_user: z.string().uuid(),
  to_user: z.string().uuid(),
  amount: z.number().positive(),
});

export const POST = withAuth(async ({ req, userId }) => {
  const body = await req.json();

  // Receiver confirms or rejects an existing settlement request.
  if (body.settlement_id) {
    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await respondToSettlement(parsed.data.settlement_id, userId, parsed.data.action);
    return NextResponse.json({ success: true });
  }

  // Payer creates a pending settlement request.
  const parsed = CreateSettlementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { group_id, from_user, to_user, amount } = parsed.data;
  
  if (from_user !== userId) {
    return NextResponse.json({ error: 'Forbidden: You can only record your own payment' }, { status: 403 });
  }

  const settlementId = await createSettlement(group_id, from_user, to_user, amount);
  return NextResponse.json({ settlement_id: settlementId, status: 'pending' }, { status: 201 });
}, 'POST /api/settlements');

export const GET = withAuth(async ({ userId }) => {
  const settlements = await getSettlementsForUser(userId);
  return NextResponse.json({ settlements });
}, 'GET /api/settlements');
