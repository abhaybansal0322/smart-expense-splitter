import { NextRequest, NextResponse } from 'next/server';
import { computeGroupBalances } from '@/services/settlementService';
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
    const balances = await computeGroupBalances(id);
    return NextResponse.json({ balances });
  } catch (error) {
    console.error('GET /api/groups/[id]/balances error:', error);
    return NextResponse.json({ error: 'Failed to compute balances' }, { status: 500 });
  }
}
