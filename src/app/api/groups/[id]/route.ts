import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, addMemberToGroup } from '@/services/groupService';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
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
    const body = await req.json();
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await addMemberToGroup(id, parsed.data.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/groups/[id] error:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
