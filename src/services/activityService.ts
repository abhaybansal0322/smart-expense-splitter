import { query } from '@/lib/db';
import { PoolClient } from '@neondatabase/serverless';

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
  client?: PoolClient
): Promise<void> {
  const { userId, groupId, action, entityType, entityId, metadata } = params;
  
  const sql = `
    INSERT INTO activity_logs (group_id, user_id, action, entity_type, entity_id, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const args = [groupId, userId, action, entityType, entityId, JSON.stringify(metadata)];

  if (client) {
    await client.query(sql, args);
  } else {
    await query(sql, args);
  }
}
