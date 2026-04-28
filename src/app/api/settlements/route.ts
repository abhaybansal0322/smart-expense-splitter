import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { logActivity } from '@/services/activityService';
import { isUserInGroup } from '@/services/groupService';

const ConfirmSchema = z.object({
  settlement_id: z.string().uuid(),
  upi_reference: z.string().optional(),
});

const CreateSettlementSchema = z.object({
  group_id: z.string().uuid(),
  from_user: z.string().uuid(),
  to_user: z.string().uuid(),
  amount: z.number().positive(),
});

// POST: Create or confirm a settlement
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Confirm existing settlement
    if (body.settlement_id) {
      const parsed = ConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      await withTransaction(async (client) => {
        const check = await client.query(
          `SELECT id, status, group_id FROM settlements WHERE id = $1 FOR UPDATE`,
          [parsed.data.settlement_id]
        );
        if (check.rowCount === 0) throw new Error('Settlement not found');
        if (check.rows[0].status !== 'pending') throw new Error('Settlement is not pending');
        
        const isMember = await isUserInGroup(check.rows[0].group_id, session.user.id);
        if (!isMember) throw new Error('Forbidden: Not in group');

        await client.query(
          `UPDATE settlements
           SET status = 'confirmed', confirmed_at = NOW(), upi_reference = $1
           WHERE id = $2`,
          [parsed.data.upi_reference ?? null, parsed.data.settlement_id]
        );
      });

      return NextResponse.json({ success: true });
    }

    // Create new settlement record
    const parsed = CreateSettlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { group_id, from_user, to_user, amount } = parsed.data;
    const isMember = await isUserInGroup(group_id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await query<{ id: string }>(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [group_id, from_user, to_user, amount]
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

    return NextResponse.json({ settlement_id: settlementId }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/settlements error:', msg);
    if (msg.includes('Forbidden')) return NextResponse.json({ error: msg }, { status: 403 });
    if (msg === 'Settlement not found') return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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
    console.error('GET /api/settlements error:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}
