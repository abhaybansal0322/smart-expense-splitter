import { NextRequest, NextResponse } from 'next/server';
import { getSettlementPlan } from '@/services/settlementService';
import { query } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const [plan, { rows: saved }] = await Promise.all([
      getSettlementPlan(id),
      query(
        `SELECT s.id, s.from_user, s.to_user, s.amount::float, s.status, s.upi_reference, s.created_at, s.confirmed_at,
                fu.name AS from_name, tu.name AS to_name, tu.upi_id AS to_upi_id
         FROM settlements s
         JOIN users fu ON fu.id = s.from_user
         JOIN users tu ON tu.id = s.to_user
         WHERE s.group_id = $1
         ORDER BY s.created_at DESC`,
        [id]
      ),
    ]);
    return NextResponse.json({ plan, settlements: saved });
  } catch (error) {
    console.error('GET /api/groups/[id]/settlements error:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}
