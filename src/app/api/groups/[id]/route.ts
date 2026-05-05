import { NextResponse } from 'next/server';
import { getGroupById, inviteMemberToGroup } from '@/services/groupService';
import { withGroupAccess } from '@/lib/apiHandler';
import { z } from 'zod';

export const GET = withGroupAccess(async ({ groupId }) => {
  const group = await getGroupById(groupId);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  return NextResponse.json({ group });
}, 'GET /api/groups/[id]');

const AddMemberSchema = z.object({ email: z.string().email() });

export const PATCH = withGroupAccess(async ({ req, groupId }) => {
  const body = await req.json();
  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await inviteMemberToGroup(groupId, parsed.data.email);
  return NextResponse.json({ success: true, status: 'pending' });
}, 'PATCH /api/groups/[id]');
