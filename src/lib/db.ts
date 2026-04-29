import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Node.js environment to enable WebSocket connections to Neon
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    pool.on('error', (err: Error) => {
      console.error('Unexpected Neon PostgreSQL pool error', err);
    });
  }
  return pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = getPool();
  const start = Date.now();
  const result = await client.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed', { text, duration, rows: result.rowCount });

    // Performance optimization: We log queries taking longer than 50ms in development
    // to identify missing indexes or inefficient query plans early.
    // We only use EXPLAIN (without ANALYZE) to avoid executing the heavy query a second time.
    if (duration > 50 && text.trim().toUpperCase().startsWith('SELECT')) {
      try {
        const explainResult = await client.query(`EXPLAIN ${text}`, params);
        console.warn('Heavy query plan (>50ms):', text);
        console.warn(explainResult.rows.map((r: Record<string, unknown>) => r['QUERY PLAN']).join('\n'));
      } catch (e) {
        console.error('Failed to run EXPLAIN', e);
      }
    }
  }
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

import { logger } from './logger';

export async function withTransaction<T>(
  fn: (client: import('@neondatabase/serverless').PoolClient) => Promise<T>,
  context?: { request_id?: string; user_id?: string; group_id?: string }
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed and rolled back', context, error);
    throw error;
  } finally {
    client.release();
  }
}
