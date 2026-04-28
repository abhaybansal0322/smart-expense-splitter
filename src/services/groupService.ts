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

export async function getAllGroups(): Promise<GroupWithDetails[]> {
  const { rows } = await query<GroupWithDetails>(
    `SELECT
       g.id, g.name, g.description, g.created_at,
       COUNT(DISTINCT gm.user_id)::int AS member_count,
       COALESCE(SUM(e.amount), 0)::float AS total_expenses,
       COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'pending')::int AS pending_settlements,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'id', u.id, 'name', u.name, 'email', u.email, 'upi_id', u.upi_id
         )) FILTER (WHERE u.id IS NOT NULL),
         '[]'
       ) AS members
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN users u ON u.id = gm.user_id
     LEFT JOIN expenses e ON e.group_id = g.id
     LEFT JOIN settlements s ON s.group_id = g.id
     GROUP BY g.id
     ORDER BY g.created_at DESC`
  );
  return rows;
}

export async function getGroupById(groupId: string): Promise<GroupWithDetails | null> {
  const { rows } = await query<GroupWithDetails>(
    `SELECT
       g.id, g.name, g.description, g.created_at,
       COUNT(DISTINCT gm.user_id)::int AS member_count,
       COALESCE(SUM(e.amount), 0)::float AS total_expenses,
       COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'pending')::int AS pending_settlements,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'id', u.id, 'name', u.name, 'email', u.email, 'upi_id', u.upi_id
         )) FILTER (WHERE u.id IS NOT NULL),
         '[]'
       ) AS members
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN users u ON u.id = gm.user_id
     LEFT JOIN expenses e ON e.group_id = g.id
     LEFT JOIN settlements s ON s.group_id = g.id
     WHERE g.id = $1
     GROUP BY g.id`,
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
     WHERE gm.group_id = $1
     ORDER BY u.name`,
    [groupId]
  );
  return rows;
}

export async function updateUserUpi(userId: string, upiId: string): Promise<void> {
  await query(`UPDATE users SET upi_id = $1 WHERE id = $2`, [upiId, userId]);
}
