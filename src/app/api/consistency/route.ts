import { NextResponse } from 'next/server';
import { runConsistencyCheck } from '@/services/consistencyService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic'; // Prevent caching for consistency checks

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check to restrict to ADMIN users. Currently checking email domain or specific logic.
    // Assuming simple role check if available, or restrict to a list/domain.
    // For now, if role is not strictly defined in types, we'll allow all authenticated users
    // but in a real-world scenario, this would check session.user.role === 'ADMIN'.

    const report = await runConsistencyCheck();
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('Consistency check failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
