import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, addMemberToGroup, isUserInGroup } from '@/services/groupService';
import { getAuthSession } from '@/lib/auth';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isMember = await isUserInGroup(id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const group = await getGroupById(id);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    return NextResponse.json({ group });
  } catch (error) {
    console.error('GET /api/groups/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

const AddMemberSchema = z.object({ email: z.string().email() });

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isMember = await isUserInGroup(id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await addMemberToGroup(id, parsed.data.email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH /api/groups/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
