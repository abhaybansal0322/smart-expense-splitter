import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user details including upi_id
    const res = await query<{id: string, name: string, email: string, upi_id?: string}>('SELECT id, name, email, upi_id FROM users WHERE id = $1', [userId]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: res.rows[0] });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
