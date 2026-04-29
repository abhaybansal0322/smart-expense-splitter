import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGroup, getGroupsForUser } from '@/services/groupService';
import { getAuthSession } from '@/lib/auth';

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  memberEmails: z.array(z.string().email()).min(1),
});

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const groups = await getGroupsForUser(session.user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('GET /api/groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description } = parsed.data;
    const memberEmails = parsed.data.memberEmails.map((email) => email.trim().toLowerCase());
    // ensure current user is in the group
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 400 });
    }
    const sessionEmail = session.user.email.trim().toLowerCase();
    if (!memberEmails.includes(sessionEmail)) {
      memberEmails.push(sessionEmail);
    }
    const groupId = await createGroup(name, description, [...new Set(memberEmails)], session.user.id, sessionEmail);
    return NextResponse.json({ groupId }, { status: 201 });
  } catch (error) {
    console.error('POST /api/groups error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create group';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
