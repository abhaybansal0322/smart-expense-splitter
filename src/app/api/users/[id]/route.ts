import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

const UpdateUpiSchema = z.object({ upi_id: z.string().min(1) });

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { rows } = await query(`SELECT id, name, email, upi_id, created_at FROM users WHERE id = $1`, [id]);
    if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user: rows[0] });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateUpiSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    await query(`UPDATE users SET upi_id = $1 WHERE id = $2`, [parsed.data.upi_id, id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update UPI' }, { status: 500 });
  }
}
