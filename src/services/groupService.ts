import { query, withTransaction } from '@/lib/db';
import { GroupInvitation, GroupWithDetails, User } from '@/lib/types';
import {
  createUniqueJoinCode,
  joinGroupByCodeWithClient,
  JoinedGroup,
} from './groupJoinService';

interface UserLookupRow {
  id: string;
  name: string;
  email: string;
}

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
  return withTransaction(async (client) => {
    const normalizedCreatorEmail = creatorEmail.trim().toLowerCase();
    const inviteEmails = [...new Set(
      memberEmails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email && email !== normalizedCreatorEmail)
    )];

    if (inviteEmails.length > 0) {
      const existingUsers = await client.query<UserLookupRow>(
        `SELECT id, name, email FROM users WHERE lower(email) = ANY($1::text[])`,
        [inviteEmails]
      );
      const existingEmails = new Set(existingUsers.rows.map((user) => user.email.toLowerCase()));
      const missingEmails = inviteEmails.filter((email) => !existingEmails.has(email));
      if (missingEmails.length > 0) {
        throw new Error(`No account found for: ${missingEmails.join(', ')}`);
      }
    }

    const joinCode = await createUniqueJoinCode(client);

    // Create group
    const groupResult = await client.query<{ id: string }>(
      `INSERT INTO groups (name, description, join_code) VALUES ($1, $2, $3) RETURNING id`,
      [name, description ?? null, joinCode]
    );
    const groupId = groupResult.rows[0].id;

    await client.query(
      `INSERT INTO group_members (user_id, group_id, status)
       VALUES ($1, $2, 'accepted')
       ON CONFLICT (user_id, group_id) DO UPDATE SET status = 'accepted'`,
      [creatorUserId, groupId]
    );

    if (inviteEmails.length > 0) {
      const userResult = await client.query<UserLookupRow>(
        `SELECT id, name, email FROM users WHERE lower(email) = ANY($1::text[])`,
        [inviteEmails]
      );
      for (const user of userResult.rows) {
        await client.query(
          `INSERT INTO group_members (user_id, group_id, status)
           VALUES ($1, $2, 'pending')
           ON CONFLICT (user_id, group_id) DO UPDATE
           SET status = CASE
             WHEN group_members.status = 'accepted' THEN 'accepted'
             ELSE 'pending'
           END`,
          [user.id, groupId]
        );
      }
    }

    return { groupId, joinCode };
  });
}

export async function joinGroupByCode(code: string, userId: string): Promise<JoinedGroup> {
  return withTransaction((client) => joinGroupByCodeWithClient(client, code, userId));
}

export async function inviteMemberToGroup(groupId: string, email: string): Promise<void> {
  await withTransaction(async (client) => {
    const normalizedEmail = email.trim().toLowerCase();
    const userResult = await client.query<UserLookupRow>(
      `SELECT id, name, email FROM users WHERE lower(email) = $1`,
      [normalizedEmail]
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new Error('No account found for that email');
    }

    const existingMembership = await client.query<{ status: string }>(
      `SELECT status FROM group_members WHERE user_id = $1 AND group_id = $2`,
      [user.id, groupId]
    );
    const existingStatus = existingMembership.rows[0]?.status;
    if (existingStatus === 'accepted') {
      throw new Error('User is already a member of this group');
    }
    if (existingStatus === 'pending') {
      throw new Error('User already has a pending invitation');
    }

    await client.query(
      `INSERT INTO group_members (user_id, group_id, status)
       VALUES ($1, $2, 'pending')`,
      [user.id, groupId]
    );
  });
}

export async function getPendingGroupInvitations(userId: string): Promise<GroupInvitation[]> {
  const { rows } = await query<GroupInvitation>(
    `SELECT
       g.id AS group_id,
       g.name AS group_name,
       g.description AS group_description,
       gm.joined_at AS invited_at,
       creator.name AS invited_by_name,
       (
         SELECT COUNT(*)::int
         FROM group_members accepted_members
         WHERE accepted_members.group_id = g.id AND accepted_members.status = 'accepted'
       ) AS accepted_member_count
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     LEFT JOIN LATERAL (
       SELECT u.name
       FROM group_members creator_member
       JOIN users u ON u.id = creator_member.user_id
       WHERE creator_member.group_id = g.id
         AND creator_member.status = 'accepted'
         AND creator_member.user_id <> gm.user_id
       ORDER BY creator_member.joined_at ASC
       LIMIT 1
     ) creator ON true
     WHERE gm.user_id = $1 AND gm.status = 'pending'
     ORDER BY gm.joined_at DESC`,
    [userId]
  );
  return rows;
}

export async function respondToGroupInvitation(
  groupId: string,
  userId: string,
  action: 'accept' | 'decline'
): Promise<void> {
  await withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'pending'`,
      [groupId, userId]
    );
    if (existing.rowCount === 0) {
      throw new Error('Invitation not found');
    }

    if (action === 'accept') {
      await client.query(
        `UPDATE group_members SET status = 'accepted' WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );
    } else {
      await client.query(
        `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'pending'`,
        [groupId, userId]
      );
    }
  });
}

// ⚡ Bolt Performance Optimization:
// Replaced multiple LEFT JOINs to one-to-many tables with scalar subqueries.
// The previous query caused a massive Cartesian explosion O(Members x Expenses x Settlements),
// leading to extreme memory/CPU usage and slow response times as group activity grew.
export async function getGroupsForUser(userId: string): Promise<GroupWithDetails[]> {
  const { rows } = await query<GroupWithDetails>(
    `SELECT
       g.id, g.name, g.description, g.join_code, g.created_at,
       (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id AND status = 'accepted') AS member_count,
       (SELECT COALESCE(SUM(amount), 0)::float FROM expenses WHERE group_id = g.id AND deleted_at IS NULL) AS total_expenses,
       (SELECT COUNT(*)::int FROM settlements WHERE group_id = g.id AND status = 'pending') AS pending_settlements,
       (
         SELECT COALESCE(
           json_agg(jsonb_build_object(
             'id', u.id, 'name', u.name, 'email', u.email, 'upi_id', u.upi_id
           )),
           '[]'
         )
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = g.id AND gm.status = 'accepted'
       ) AS members
     FROM groups g
     JOIN group_members gm_filter ON gm_filter.group_id = g.id
     WHERE gm_filter.user_id = $1 AND gm_filter.status = 'accepted'
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return rows;
}

// ⚡ Bolt Performance Optimization:
// Similarly optimized by replacing Cartesian explosion joins with precise scalar subqueries.
export async function getGroupById(groupId: string): Promise<GroupWithDetails | null> {
  const { rows } = await query<GroupWithDetails>(
    `SELECT
       g.id, g.name, g.description, g.join_code, g.created_at,
       (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.id AND status = 'accepted') AS member_count,
       (SELECT COALESCE(SUM(amount), 0)::float FROM expenses WHERE group_id = g.id AND deleted_at IS NULL) AS total_expenses,
       (SELECT COUNT(*)::int FROM settlements WHERE group_id = g.id AND status = 'pending') AS pending_settlements,
       (
         SELECT COALESCE(
           json_agg(jsonb_build_object(
             'id', u.id, 'name', u.name, 'email', u.email, 'upi_id', u.upi_id
           )),
           '[]'
         )
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = g.id AND gm.status = 'accepted'
       ) AS members
     FROM groups g
     WHERE g.id = $1`,
    [groupId]
  );
  return rows[0] ?? null;
}

export async function getGroupMembers(groupId: string): Promise<User[]> {
  const { rows } = await query<User>(
    `SELECT u.id, u.name, u.email, u.upi_id, u.created_at
     FROM users u
     JOIN group_members gm ON gm.user_id = u.id
     WHERE gm.group_id = $1 AND gm.status = 'accepted'
     ORDER BY u.name`,
    [groupId]
  );
  return rows;
}


export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [groupId, userId]
  );
  return (rowCount ?? 0) > 0;
}
