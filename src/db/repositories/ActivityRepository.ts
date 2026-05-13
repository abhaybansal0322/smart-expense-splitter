import { db } from '../client';
import { activityLogs } from '../schema';
import { eq, desc } from 'drizzle-orm';

export type ActivityWriteClient = {
  insert: (table: typeof activityLogs) => {
    values: (data: typeof activityLogs.$inferInsert) => unknown;
  };
};

export class ActivityRepository {
  static async findByGroup(groupId: string, limit = 50) {
    return db.query.activityLogs.findMany({
      where: eq(activityLogs.groupId, groupId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(activityLogs.createdAt)],
      limit,
    });
  }

  static async create(data: typeof activityLogs.$inferInsert, tx?: ActivityWriteClient) {
    const client = tx || db;
    await client.insert(activityLogs).values(data);
  }
}
