import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, isUserInGroup } from '@/services/groupService';
import { getExpensesByGroup } from '@/services/expenseService';
import { computeGroupBalances, minimizeTransactions } from '@/services/settlementService';
import { getGroupLeaderboard } from '@/services/leaderboardService';
import { query } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const request_id = crypto.randomUUID();
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isMember = await isUserInGroup(id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    logger.info('Fetching comprehensive group details', { request_id, user_id: session.user.id, group_id: id });

    const [group, expenses, balances, leaderboard, { rows: savedSettlements }] = await Promise.all([
      getGroupById(id),
      getExpensesByGroup(id),
      computeGroupBalances(id),
      getGroupLeaderboard(id),
      query(
        `SELECT s.id, s.from_user, s.to_user, s.amount::float, s.status, s.upi_reference, s.created_at, s.confirmed_at,
                fu.name AS from_name, tu.name AS to_name, tu.upi_id AS to_upi_id
         FROM settlements s
         JOIN users fu ON fu.id = s.from_user
         JOIN users tu ON tu.id = s.to_user
         WHERE s.group_id = $1
         ORDER BY s.created_at DESC`,
        [id]
      )
    ]);

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const plan = minimizeTransactions(balances);

    return NextResponse.json({
      group,
      expenses,
      balances,
      leaderboard,
      settlements: {
        plan,
        settlements: savedSettlements,
        current_user_id: session.user.id
      }
    });
  } catch (error) {
    logger.error('GET /api/groups/[id]/details error', { request_id, group_id: id }, error);
    return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 });
  }
}
