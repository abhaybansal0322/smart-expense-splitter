import { query, withTransaction } from '@/lib/db';
import { Group, GroupWithDetails, User } from '@/lib/types';

export async function createGroup(
  name: string,
  description: string | undefined,
  memberEmails: string[]
): Promise<string> {
  return withTransaction(async (client) => {
    // Create group
    const groupResult = await client.query<{ id: string }>(
      `INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id`,
      [name, description ?? null]
    );
    const groupId = groupResult.rows[0].id;

    // Upsert users by email and add to group
    for (const email of memberEmails) {
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (name, email)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [email.split('@')[0], email.toLowerCase()]
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, groupId]
      );
    }

    return groupId;
  });
}

// ⚡ Bolt Performance Optimization:
// Replaced multiple LEFT JOINs to one-to-many tables with scalar subqueries.
// The previous query caused a massive Cartesian explosion O(Members x Expenses x Settlements),
// leading to extreme memory/CPU usage and slow response times as group activity grew.
export async function getGroupsForUser(userId: string): Promise<GroupWithDetails[]> {
  const { rows } = await query<GroupWithDetails>(
    `SELECT
       g.id, g.name, g.description, g.created_at,
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
       g.id, g.name, g.description, g.created_at,
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

export async function addMemberToGroup(groupId: string, email: string): Promise<void> {
  await withTransaction(async (client) => {
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (name, email)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [email.split('@')[0], email.toLowerCase()]
    );
    const userId = userResult.rows[0].id;
    await client.query(
      `INSERT INTO group_members (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, groupId]
    );
  });
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

export async function updateUserUpi(userId: string, upiId: string): Promise<void> {
  await query(`UPDATE users SET upi_id = $1 WHERE id = $2`, [upiId, userId]);
}

export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [groupId, userId]
  );
  return (rowCount ?? 0) > 0;
}
