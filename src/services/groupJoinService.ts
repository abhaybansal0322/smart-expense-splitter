export interface QueryClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

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
  client: QueryClient,
  nextCode: () => string = generateJoinCode
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = normalizeJoinCode(nextCode());
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM groups WHERE join_code = $1 LIMIT 1`,
      [code]
    );
    if (existing.rowCount === 0) {
      return code;
    }
  }

  throw new Error('Could not generate a unique group code');
}

export async function joinGroupByCodeWithClient(
  client: QueryClient,
  code: string,
  userId: string
): Promise<JoinedGroup> {
  const normalizedCode = normalizeJoinCode(code);
  const groupResult = await client.query<{ id: string }>(
    `SELECT id FROM groups WHERE join_code = $1`,
    [normalizedCode]
  );
  const groupId = groupResult.rows[0]?.id;

  if (!groupId) {
    throw new GroupJoinError('invalid_code', 'Invalid group code');
  }

  const membership = await client.query<{ status: string }>(
    `SELECT status FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  const status = membership.rows[0]?.status;

  if (status === 'accepted') {
    throw new GroupJoinError('already_member', 'You are already a member of this group');
  }

  if (status === 'pending') {
    await client.query(
      `UPDATE group_members SET status = 'accepted' WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
  } else {
    await client.query(
      `INSERT INTO group_members (user_id, group_id, status) VALUES ($1, $2, 'accepted')`,
      [userId, groupId]
    );
  }

  return { groupId };
}
