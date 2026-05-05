import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGroup, getGroupsForUser } from '@/services/groupService';
import { withAuth } from '@/lib/apiHandler';

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  memberEmails: z.array(z.string().email()).optional().default([]),
});

export const GET = withAuth(async ({ userId }) => {
  const groups = await getGroupsForUser(userId);
  return NextResponse.json({ groups });
}, 'GET /api/groups');

export const POST = withAuth(async ({ req, userId, userEmail }) => {
  const body = await req.json();
  const parsed = CreateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description } = parsed.data;
  const memberEmails = parsed.data.memberEmails.map((email) => email.trim().toLowerCase());
  const normalizedCreatorEmail = userEmail.trim().toLowerCase();
  
  if (!memberEmails.includes(normalizedCreatorEmail)) {
    memberEmails.push(normalizedCreatorEmail);
  }

  const group = await createGroup(
    name, 
    description, 
    [...new Set(memberEmails)], 
    userId, 
    normalizedCreatorEmail
  );
  
  return NextResponse.json(group, { status: 201 });
}, 'POST /api/groups');
