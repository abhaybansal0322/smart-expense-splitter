import { NextRequest, NextResponse } from 'next/server';
import { computeGroupBalances } from '@/services/settlementService';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const balances = await computeGroupBalances(id);
    return NextResponse.json({ balances });
  } catch (error) {
    console.error('GET /api/groups/[id]/balances error:', error);
    return NextResponse.json({ error: 'Failed to compute balances' }, { status: 500 });
  }
}
