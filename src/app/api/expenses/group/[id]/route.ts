import { NextRequest, NextResponse } from 'next/server';
import { getExpensesByGroup } from '@/services/expenseService';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const expenses = await getExpensesByGroup(id);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('GET /api/expenses/group/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
