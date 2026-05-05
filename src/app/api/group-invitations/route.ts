import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/apiHandler';
import {
  getPendingGroupInvitations,
  respondToGroupInvitation,
} from '@/services/groupService';

const RespondSchema = z.object({
  group_id: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
});

export const GET = withAuth(async ({ userId }) => {
  const invitations = await getPendingGroupInvitations(userId);
  return NextResponse.json({ invitations });
}, 'GET /api/group-invitations');

export const PATCH = withAuth(async ({ req, userId }) => {
  const body = await req.json();
  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await respondToGroupInvitation(parsed.data.group_id, userId, parsed.data.action);
  return NextResponse.json({ success: true });
}, 'PATCH /api/group-invitations');
