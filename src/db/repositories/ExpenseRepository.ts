import { db } from '../client';
import { expenses, expenseSplits } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export class ExpenseRepository {
  static async findById(id: string) {
    const expense = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, id), isNull(expenses.deletedAt)),
    });
    return expense ?? null;
  }

  static async findByGroup(groupId: string) {
    return db.query.expenses.findMany({
      where: and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)),
      orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
    });
  }

  static async softDelete(id: string) {
    await db
      .update(expenses)
      .set({ deletedAt: new Date() })
      .where(eq(expenses.id, id));
  }

  static async create(data: typeof expenses.$inferInsert) {
    const [expense] = await db.insert(expenses).values(data).returning();
    return expense;
  }

  static async update(id: string, data: Partial<typeof expenses.$inferInsert>) {
    await db.update(expenses).set(data).where(eq(expenses.id, id));
  }

  static async createSplit(data: typeof expenseSplits.$inferInsert) {
    await db.insert(expenseSplits).values(data);
  }

  static async deleteSplits(expenseId: string) {
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  }
}
