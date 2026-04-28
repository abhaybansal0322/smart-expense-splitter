import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGroup, getAllGroups } from '@/services/groupService';

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  memberEmails: z.array(z.string().email()).min(1),
});

export async function GET() {
  try {
    const groups = await getAllGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('GET /api/groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, memberEmails } = parsed.data;
    const groupId = await createGroup(name, description, memberEmails);
    return NextResponse.json({ groupId }, { status: 201 });
  } catch (error) {
    console.error('POST /api/groups error:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
