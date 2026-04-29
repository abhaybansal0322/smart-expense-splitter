import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import {
  getPendingGroupInvitations,
  respondToGroupInvitation,
} from '@/services/groupService';

const RespondSchema = z.object({
  group_id: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
});

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invitations = await getPendingGroupInvitations(session.user.id);
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('GET /api/group-invitations error:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await respondToGroupInvitation(parsed.data.group_id, session.user.id, parsed.data.action);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/group-invitations error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update invitation';
    const status = message === 'Invitation not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
