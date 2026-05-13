import { db } from '@/db/client';
import { groups, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { eventBus, DomainEvent } from '@/lib/events';

export interface JoinedGroup {
  groupId: string;
}

export type GroupJoinErrorCode = 'invalid_code' | 'already_member';

export class GroupJoinError extends Error {
  constructor(
    public readonly code: GroupJoinErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'GroupJoinError';
  }
}

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const JOIN_CODE_LENGTH = 6;

export type GroupJoinClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

export async function createUniqueJoinCode(
  tx?: Pick<GroupJoinClient, 'query'>,
  nextCode: () => string = generateJoinCode
): Promise<string> {
  const client = tx || db;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = normalizeJoinCode(nextCode());
    const existing = await client.query.groups.findFirst({
      where: eq(groups.joinCode, code),
      columns: { id: true }
    });
    if (!existing) {
      return code;
    }
  }

  throw new Error('Could not generate a unique group code');
}

// This can be used inside or outside a transaction by passing tx
export async function joinGroupByCodeWithClient(
  tx: GroupJoinClient,
  code: string,
  userId: string
): Promise<JoinedGroup> {
  const normalizedCode = normalizeJoinCode(code);
  
  // Try to find group using the provided transaction client if possible, 
  // but if it's the old pg client, we use a fallback or ensure it's drizzle-compatible.
  // For the actual app, tx is always a drizzle transaction.
  const group = await tx.query.groups.findFirst({
    where: eq(groups.joinCode, normalizedCode),
    columns: { id: true }
  });

  if (!group) {
    throw new GroupJoinError('invalid_code', 'Invalid group code');
  }

  const membership = await tx.query.groupMembers.findFirst({
    where: and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId))
  });

  if (membership?.status === 'accepted') {
    throw new GroupJoinError('already_member', 'You are already a member of this group');
  }

  await tx.insert(groupMembers).values({
    userId,
    groupId: group.id,
    status: 'accepted'
  }).onConflictDoUpdate({
    target: [groupMembers.userId, groupMembers.groupId],
    set: { status: 'accepted' }
  });

  eventBus.emit(DomainEvent.MEMBER_JOINED, {
    userId,
    groupId: group.id,
    tx
  });

  return { groupId: group.id };
}
