import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, withTransaction } from '@/lib/db';

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
    const body = await req.json();

    // Confirm existing settlement
    if (body.settlement_id) {
      const parsed = ConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      await withTransaction(async (client) => {
        const check = await client.query(
          `SELECT id, status FROM settlements WHERE id = $1 FOR UPDATE`,
          [parsed.data.settlement_id]
        );
        if (check.rowCount === 0) throw new Error('Settlement not found');
        if (check.rows[0].status !== 'pending') throw new Error('Settlement is not pending');

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
    const result = await query<{ id: string }>(
      `INSERT INTO settlements (group_id, from_user, to_user, amount, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [group_id, from_user, to_user, amount]
    );

    return NextResponse.json({ settlement_id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/settlements error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

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
