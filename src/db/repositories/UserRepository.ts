import { db } from '../client';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  static async findById(id: string) {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return result ?? null;
  }

  static async findByEmail(email: string) {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    return result ?? null;
  }

  static async create(data: typeof users.$inferInsert) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }
}
