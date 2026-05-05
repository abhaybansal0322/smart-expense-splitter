import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export interface ConsistencyReport {
  expenseSplitSumMismatches: unknown[];
  orphanExpenseSplits: unknown[];
  invalidSettlements: unknown[];
  negativeAnomalies: {
    expenses: unknown[];
    expenseSplits: unknown[];
    settlements: unknown[];
  };
  duplicateRecords: {
    expenses: unknown[];
    expenseSplits: unknown[];
    settlements: unknown[];
  };
}

export async function runConsistencyCheck(): Promise<ConsistencyReport> {
  const report: ConsistencyReport = {
    expenseSplitSumMismatches: [],
    orphanExpenseSplits: [],
    invalidSettlements: [],
    negativeAnomalies: {
      expenses: [],
      expenseSplits: [],
      settlements: [],
    },
    duplicateRecords: {
      expenses: [],
      expenseSplits: [],
      settlements: [],
    },
  };

  // 1. Verify: SUM(splits) = expense.amount
  const sumMismatchRes = await db.execute(sql`
    WITH split_sums AS (
      SELECT expense_id, SUM(share) as total_shares
      FROM expense_splits
      GROUP BY expense_id
    )
    SELECT e.id, e.amount, COALESCE(ss.total_shares, 0) as total_shares
    FROM expenses e
    LEFT JOIN split_sums ss ON e.id = ss.expense_id
    WHERE e.deleted_at IS NULL AND ROUND(e.amount, 2) != ROUND(COALESCE(ss.total_shares, 0), 2)
  `);
  report.expenseSplitSumMismatches = sumMismatchRes.rows;

  // 2. Verify: No orphan expense_splits
  const orphanSplitsRes = await db.execute(sql`
    SELECT es.id, es.expense_id
    FROM expense_splits es
    LEFT JOIN expenses e ON es.expense_id = e.id
    WHERE e.id IS NULL OR e.deleted_at IS NOT NULL
  `);
  report.orphanExpenseSplits = orphanSplitsRes.rows;

  // 3. Verify: No invalid settlements
  const invalidSettlementsRes = await db.execute(sql`
    SELECT id, from_user, to_user, amount
    FROM settlements
    WHERE from_user = to_user OR amount <= 0
  `);
  report.invalidSettlements = invalidSettlementsRes.rows;

  // 4. Detect: negative anomalies
  const negativeExpensesRes = await db.execute(sql`SELECT id, amount FROM expenses WHERE amount < 0`);
  report.negativeAnomalies.expenses = negativeExpensesRes.rows;

  const negativeSplitsRes = await db.execute(sql`SELECT id, share FROM expense_splits WHERE share < 0`);
  report.negativeAnomalies.expenseSplits = negativeSplitsRes.rows;

  const negativeSettlementsRes = await db.execute(sql`SELECT id, amount FROM settlements WHERE amount < 0`);
  report.negativeAnomalies.settlements = negativeSettlementsRes.rows;

  // 5. Detect: duplicate records
  const dupExpensesRes = await db.execute(sql`
    SELECT e1.id as id1, e2.id as id2, e1.group_id, e1.paid_by, e1.amount, e1.description
    FROM expenses e1
    JOIN expenses e2 ON e1.group_id = e2.group_id
      AND e1.paid_by = e2.paid_by
      AND e1.amount = e2.amount
      AND e1.description = e2.description
      AND e1.id < e2.id
    WHERE e1.deleted_at IS NULL AND e2.deleted_at IS NULL
      AND ABS(EXTRACT(EPOCH FROM (e1.created_at - e2.created_at))) < 300
  `);
  report.duplicateRecords.expenses = dupExpensesRes.rows;

  const dupSplitsRes = await db.execute(sql`
    SELECT expense_id, user_id, COUNT(*) as count
    FROM expense_splits
    GROUP BY expense_id, user_id
    HAVING COUNT(*) > 1
  `);
  report.duplicateRecords.expenseSplits = dupSplitsRes.rows;

  const dupSettlementsRes = await db.execute(sql`
    SELECT s1.id as id1, s2.id as id2, s1.group_id, s1.from_user, s1.to_user, s1.amount
    FROM settlements s1
    JOIN settlements s2 ON s1.group_id = s2.group_id
      AND s1.from_user = s2.from_user
      AND s1.to_user = s2.to_user
      AND s1.amount = s2.amount
      AND s1.id < s2.id
    WHERE ABS(EXTRACT(EPOCH FROM (s1.created_at - s2.created_at))) < 300
  `);
  report.duplicateRecords.settlements = dupSettlementsRes.rows;

  return report;
}
