import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

// GET pending dues for a user (expenses older than X days unpaid)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const OVERDUE_DAYS = 7;

  try {
    const { rows } = await query(
      `SELECT
         e.id AS expense_id,
         e.description,
         e.amount::float,
         es.share::float,
         u.name AS paid_by_name,
         EXTRACT(DAY FROM NOW() - e.created_at)::int AS days_overdue,
         e.created_at,
         g.name AS group_name,
         g.id AS group_id
       FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       JOIN users u ON u.id = e.paid_by
       JOIN groups g ON g.id = e.group_id
       WHERE es.user_id = $1
         AND es.user_id <> e.paid_by
         AND e.deleted_at IS NULL
         AND e.created_at < NOW() - INTERVAL '${OVERDUE_DAYS} days'
         AND NOT EXISTS (
           SELECT 1 FROM settlements s
           WHERE s.from_user = es.user_id
             AND s.to_user = e.paid_by
             AND s.group_id = e.group_id
             AND s.status = 'confirmed'
         )
       ORDER BY e.created_at ASC`,
      [id]
    );
    return NextResponse.json({ dues: rows, overdueDays: OVERDUE_DAYS });
  } catch (error) {
    console.error('GET /api/users/[id]/dues error:', error);
    return NextResponse.json({ error: 'Failed to fetch dues' }, { status: 500 });
  }
}
