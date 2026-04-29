import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { logActivity } from '@/services/activityService';
import { isUserInGroup } from '@/services/groupService';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const ConfirmSchema = z.object({
  settlement_id: z.string().uuid(),
  action: z.enum(['confirm', 'reject']).default('confirm'),
  upi_reference: z.string().optional(),
});

const CreateSettlementSchema = z.object({
  group_id: z.string().uuid(),
  from_user: z.string().uuid(),
  to_user: z.string().uuid(),
  amount: z.number().positive(),
  upi_reference: z.string().optional(),
});

// POST: Create or confirm a settlement
export async function POST(req: NextRequest) {
  const request_id = crypto.randomUUID();
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Receiver confirms or rejects an existing settlement request.
    if (body.settlement_id) {
      const parsed = ConfirmSchema.safeParse(body);
      if (!parsed.success) {
        logger.warn('Settlement confirmation validation failed', { request_id, validation_error: parsed.error.flatten() });
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      await withTransaction(async (client) => {
        const check = await client.query<{
          id: string;
          status: string;
          group_id: string;
          to_user: string;
        }>(
          `SELECT id, status, group_id, to_user FROM settlements WHERE id = $1 FOR UPDATE`,
          [parsed.data.settlement_id]
        );
        if (check.rowCount === 0) throw new Error('Settlement not found');
        if (check.rows[0].status !== 'pending') throw new Error('Settlement is not pending');
        if (check.rows[0].to_user !== session.user.id) {
          throw new Error('Forbidden: Only the receiver can respond to this payment');
        }

        if (parsed.data.action === 'confirm') {
          await client.query(
            `UPDATE settlements
             SET status = 'confirmed', confirmed_at = NOW(), upi_reference = COALESCE($1, upi_reference)
             WHERE id = $2`,
            [parsed.data.upi_reference ?? null, parsed.data.settlement_id]
          );
        } else {
          await client.query(
            `UPDATE settlements
             SET status = 'cancelled'
             WHERE id = $1`,
            [parsed.data.settlement_id]
          );
        }
      }, { request_id, user_id: session.user.id });

      logger.info('Settlement response recorded', { request_id, user_id: session.user.id, settlement_id: parsed.data.settlement_id, action: parsed.data.action });

      return NextResponse.json({ success: true });
    }

    // Payer creates a pending settlement request. Receiver must confirm it.
    const parsed = CreateSettlementSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('Settlement creation validation failed', { request_id, validation_error: parsed.error.flatten() });
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { group_id, from_user, to_user, amount } = parsed.data;
    if (from_user !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only record your own payment' }, { status: 403 });
    }
    if (from_user === to_user) {
      return NextResponse.json({ error: 'Payer and receiver must be different users' }, { status: 400 });
    }

    const [payerIsMember, receiverIsMember] = await Promise.all([
      isUserInGroup(group_id, from_user),
      isUserInGroup(group_id, to_user),
    ]);
    if (!payerIsMember || !receiverIsMember) {
      return NextResponse.json({ error: 'Both users must be accepted members of this group' }, { status: 400 });
    }

    const pendingDuplicate = await query(
      `SELECT 1 FROM settlements
       WHERE group_id = $1
         AND from_user = $2
         AND to_user = $3
         AND status = 'pending'
       LIMIT 1`,
      [group_id, from_user, to_user]
    );
    if (pendingDuplicate.rowCount > 0) {
      return NextResponse.json({ error: 'A payment request is already waiting for this receiver' }, { status: 400 });
    }

    const result = await query<{ id: string }>(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, status, upi_reference)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING id`,
      [group_id, from_user, to_user, amount, parsed.data.upi_reference ?? null]
    );

    const settlementId = result.rows[0].id;
    await logActivity({
      userId: session.user.id,
      groupId: group_id,
      action: 'SETTLEMENT_CREATED',
      entityType: 'settlement',
      entityId: settlementId,
      metadata: {
        amount,
        from_user,
        to_user
      }
    });

    logger.info('Settlement created', { request_id, user_id: session.user.id, group_id, settlement_id: settlementId });

    return NextResponse.json({ settlement_id: settlementId, status: 'pending' }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('POST /api/settlements error', { request_id }, error);
    if (msg.includes('Forbidden')) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg === 'Settlement not found') return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const request_id = crypto.randomUUID();
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Always use authenticated user
    const userId = session.user.id;

    const { rows } = await query(
      `SELECT s.id, s.group_id, s.from_user, s.to_user, s.amount::float, s.status,
              s.created_at, s.confirmed_at,
              fu.name AS from_name, tu.name AS to_name,
              g.name AS group_name
       FROM settlements s
       JOIN users fu ON fu.id = s.from_user
       JOIN users tu ON tu.id = s.to_user
       JOIN groups g ON g.id = s.group_id
       WHERE ($1::uuid IS NULL OR s.from_user = $1 OR s.to_user = $1)
       ORDER BY s.created_at DESC`,
      [userId]
    );
    return NextResponse.json({ settlements: rows });
  } catch (error) {
    logger.error('GET /api/settlements error', { request_id }, error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}
