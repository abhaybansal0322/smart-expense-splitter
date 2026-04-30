import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { GroupJoinError } from '@/services/groupJoinService';
import { joinGroupByCode } from '@/services/groupService';

const JoinGroupSchema = z.object({
  code: z.string().min(1).max(32),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = JoinGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const joined = await joinGroupByCode(parsed.data.code, session.user.id);
    return NextResponse.json(joined);
  } catch (error) {
    console.error('POST /api/groups/join error:', error);
    if (error instanceof GroupJoinError) {
      const status = error.code === 'invalid_code' ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }

    const message = error instanceof Error ? error.message : 'Failed to join group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
