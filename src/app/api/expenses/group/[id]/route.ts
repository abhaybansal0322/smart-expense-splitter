import { NextRequest, NextResponse } from 'next/server';
import { getExpensesByGroup } from '@/services/expenseService';
import { isUserInGroup } from '@/services/groupService';
import { getAuthSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isMember = await isUserInGroup(id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const expenses = await getExpensesByGroup(id);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('GET /api/expenses/group/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
