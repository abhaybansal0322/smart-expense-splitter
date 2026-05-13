import { db } from '../client';
import { groups, groupMembers, users } from '../schema';
import { eq, and } from 'drizzle-orm';

export class GroupRepository {
  static async findById(id: string) {
    const result = await db.query.groups.findFirst({
      where: eq(groups.id, id),
      with: {
        members: {
          with: {
            user: true
          },
          where: (members, { eq }) => eq(members.status, 'accepted')
        },
        expenses: {
          where: (expenses, { isNull }) => isNull(expenses.deletedAt)
        },
        settlements: {
          where: (settlements, { eq }) => eq(settlements.status, 'pending')
        }
      }
    });
    return result ?? null;
  }

  static async findByJoinCode(code: string) {
    const result = await db.query.groups.findFirst({
      where: eq(groups.joinCode, code.toUpperCase()),
    });
    return result ?? null;
  }

  static async getMembers(groupId: string) {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: groupMembers.status,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, 'accepted')));
  }

  static async isUserInGroup(groupId: string, userId: string) {
    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.status, 'accepted')
      ),
    });
    return !!membership;
  }

  static async getGroupsForUser(userId: string) {
    return db.query.groups.findMany({
      where: (groups, { exists }) => exists(
        db.select()
          .from(groupMembers)
          .where(and(
            eq(groupMembers.groupId, groups.id),
            eq(groupMembers.userId, userId),
            eq(groupMembers.status, 'accepted')
          ))
      ),
      with: {
        members: {
          with: {
            user: true
          },
          where: (members, { eq }) => eq(members.status, 'accepted')
        },
        expenses: {
          where: (expenses, { isNull }) => isNull(expenses.deletedAt)
        },
        settlements: {
          where: (settlements, { eq }) => eq(settlements.status, 'pending')
        }
      },
      orderBy: (groups, { desc }) => [desc(groups.createdAt)]
    });
  }

  static async getPendingInvitations(userId: string) {
    return db.query.groupMembers.findMany({
      where: and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.status, 'pending')
      ),
      with: {
        group: {
          with: {
            members: {
              where: (members, { eq }) => eq(members.status, 'accepted'),
              with: { user: true }
            }
          }
        }
      },
      orderBy: (groupMembers, { desc }) => [desc(groupMembers.joinedAt)]
    });
  }

  static async createInvitation(groupId: string, userId: string) {
    await db.insert(groupMembers).values({
      groupId,
      userId,
      status: 'pending'
    });
  }

  static async updateMemberStatus(groupId: string, userId: string, status: 'accepted' | 'pending') {
    await db.update(groupMembers)
      .set({ status })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  static async removeMember(groupId: string, userId: string) {
    await db.delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }
}
