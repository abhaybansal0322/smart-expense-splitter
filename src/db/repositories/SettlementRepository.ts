import { db } from '../client';
import { settlements } from '../schema';
import { eq, and, or, desc } from 'drizzle-orm';

export class SettlementRepository {
  static async findById(id: string) {
    const settlement = await db.query.settlements.findFirst({
      where: eq(settlements.id, id),
    });
    return settlement ?? null;
  }

  static async findForUser(userId: string) {
    return db.query.settlements.findMany({
      where: or(eq(settlements.fromUser, userId), eq(settlements.toUser, userId)),
      with: {
        sender: true,
        receiver: true,
        group: true
      },
      orderBy: [desc(settlements.createdAt)]
    });
  }

  static async findPending(groupId: string, fromUser: string, toUser: string) {
    return db.query.settlements.findFirst({
      where: and(
        eq(settlements.groupId, groupId),
        eq(settlements.fromUser, fromUser),
        eq(settlements.toUser, toUser),
        eq(settlements.status, 'pending')
      )
    });
  }

  static async create(data: typeof settlements.$inferInsert) {
    const [settlement] = await db.insert(settlements).values(data).returning();
    return settlement;
  }

  static async updateStatus(id: string, status: 'confirmed' | 'cancelled', confirmedAt?: Date) {
    await db.update(settlements)
      .set({ status, confirmedAt })
      .where(eq(settlements.id, id));
  }
}
