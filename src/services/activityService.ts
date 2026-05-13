import { db } from '@/db/client';
import { activityLogs } from '@/db/schema';
import type { ActivityWriteClient } from '@/db/repositories/ActivityRepository';

export interface LogActivityParams {
  userId: string;
  groupId: string;
  action: 'EXPENSE_CREATED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED' | 'SETTLEMENT_CREATED';
  entityType: 'expense' | 'settlement';
  entityId: string;
  metadata: Record<string, unknown>;
}

export async function logActivity(
  params: LogActivityParams,
  tx?: ActivityWriteClient
): Promise<void> {
  const { userId, groupId, action, entityType, entityId, metadata } = params;
  
  const client = tx || db;

  await client.insert(activityLogs).values({
    groupId,
    userId,
    action,
    entityType,
    entityId,
    metadata
  });
}
