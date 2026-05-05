import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async ({ userId }) => {
  const res = await query<{id: string, name: string, email: string}>(
    'SELECT id, name, email FROM users WHERE id = $1', 
    [userId]
  );

  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: res.rows[0] });
}, 'GET /api/me');
