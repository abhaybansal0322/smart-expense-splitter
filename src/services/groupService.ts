import { GroupInvitation, GroupWithDetails, User } from '@/lib/types';
import { GroupRepository } from '@/db/repositories/GroupRepository';
import { UserRepository } from '@/db/repositories/UserRepository';
import { db } from '@/db/client';
import { groups, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createUniqueJoinCode, joinGroupByCodeWithClient } from './groupJoinService';
import { eventBus, DomainEvent } from '@/lib/events';

export interface CreatedGroup {
  groupId: string;
  joinCode: string;
}

export async function createGroup(
  name: string,
  description: string | undefined,
  memberEmails: string[],
  creatorUserId: string,
  creatorEmail: string
): Promise<CreatedGroup> {
  return db.transaction(async (tx) => {
    const normalizedCreatorEmail = creatorEmail.trim().toLowerCase();
    const inviteEmails = [...new Set(
      memberEmails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email && email !== normalizedCreatorEmail)
    )];

    if (inviteEmails.length > 0) {
      for (const email of inviteEmails) {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
          throw new Error(`No account found for: ${email}`);
        }
      }
    }

    const joinCode = await createUniqueJoinCode(); // We'll need to update joinService too eventually

    const [newGroup] = await tx.insert(groups).values({
      name,
      description: description ?? null,
      joinCode
    }).returning();

    await tx.insert(groupMembers).values({
      userId: creatorUserId,
      groupId: newGroup.id,
      status: 'accepted'
    });

    if (inviteEmails.length > 0) {
      for (const email of inviteEmails) {
        const user = await UserRepository.findByEmail(email);
        if (user) {
          await tx.insert(groupMembers).values({
            userId: user.id,
            groupId: newGroup.id,
            status: 'pending'
          }).onConflictDoNothing();
        }
      }
    }

    eventBus.emit(DomainEvent.GROUP_CREATED, {
      userId: creatorUserId,
      groupId: newGroup.id,
      name: newGroup.name,
      tx
    });

    return { groupId: newGroup.id, joinCode };
  });
}

export async function joinGroupByCode(code: string, userId: string): Promise<JoinedGroup> {
  return db.transaction(async (tx) => joinGroupByCodeWithClient(tx, code, userId));
}

export async function inviteMemberToGroup(groupId: string, email: string): Promise<void> {
  const user = await UserRepository.findByEmail(email);
  if (!user) throw new Error('No account found for that email');

  const existing = await db.query.groupMembers.findFirst({
    where: and(eq(groupMembers.userId, user.id), eq(groupMembers.groupId, groupId))
  });

  if (existing?.status === 'accepted') throw new Error('User is already a member');
  if (existing?.status === 'pending') throw new Error('User already has a pending invitation');

  await db.insert(groupMembers).values({
    userId: user.id,
    groupId,
    status: 'pending'
  });
}

export async function getPendingGroupInvitations(userId: string): Promise<GroupInvitation[]> {
  const invites = await GroupRepository.getPendingInvitations(userId);
  return invites.map(inv => ({
    group_id: inv.groupId,
    group_name: inv.group.name,
    group_description: inv.group.description ?? '',
    invited_at: inv.joinedAt.toISOString(),
    invited_by_name: inv.group.members[0]?.user.name ?? 'Someone',
    accepted_member_count: inv.group.members.length
  }));
}

export async function respondToGroupInvitation(
  groupId: string,
  userId: string,
  action: 'accept' | 'decline'
): Promise<void> {
  if (action === 'accept') {
    await GroupRepository.updateMemberStatus(groupId, userId, 'accepted');
    eventBus.emit(DomainEvent.MEMBER_JOINED, {
      userId,
      groupId
    });
  } else {
    await GroupRepository.removeMember(groupId, userId);
  }
}

export async function getGroupsForUser(userId: string): Promise<GroupWithDetails[]> {
  const rawGroups = await GroupRepository.getGroupsForUser(userId);
  return rawGroups.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    join_code: g.joinCode,
    created_at: g.createdAt.toISOString(),
    member_count: g.members.length,
    total_expenses: g.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    pending_settlements: g.settlements.length,
    members: g.members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email
    }))
  }));
}

export async function getGroupById(groupId: string): Promise<GroupWithDetails | null> {
  const g = await GroupRepository.findById(groupId);
  if (!g) return null;
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    join_code: g.joinCode,
    created_at: g.createdAt.toISOString(),
    member_count: g.members.length,
    total_expenses: g.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    pending_settlements: g.settlements.length,
    members: g.members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email
    }))
  };
}

export async function getGroupMembers(groupId: string): Promise<User[]> {
  const members = await GroupRepository.getMembers(groupId);
  return members.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    created_at: new Date().toISOString() // Placeholder or fetch from user
  }));
}

export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  return GroupRepository.isUserInGroup(groupId, userId);
}
