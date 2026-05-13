import { NextRequest, NextResponse } from 'next/server';
import { getGroupById, isUserInGroup } from '@/services/groupService';
import { getExpensesByGroup } from '@/services/expenseService';
import { computeGroupBalances, minimizeTransactions } from '@/services/settlementService';
import { getGroupLeaderboard } from '@/services/leaderboardService';
import { db } from '@/db/client';
import { settlements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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

    // Use Drizzle for settlements query as well
    const [group, expenses, balances, leaderboard, savedSettlementsRaw] = await Promise.all([
      getGroupById(id),
      getExpensesByGroup(id),
      computeGroupBalances(id),
      getGroupLeaderboard(id),
      db.query.settlements.findMany({
        where: eq(settlements.groupId, id),
        with: {
          sender: true,
          receiver: true
        },
        orderBy: [desc(settlements.createdAt)]
      })
    ]);

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const plan = minimizeTransactions(balances);

    // Map savedSettlements to match the expected format (from_name, to_name, amount as number)
    const savedSettlements = savedSettlementsRaw.map(s => ({
      id: s.id,
      from_user: s.fromUser,
      to_user: s.toUser,
      amount: Number(s.amount),
      status: s.status,
      created_at: s.createdAt.toISOString(),
      confirmed_at: s.confirmedAt?.toISOString() || null,
      from_name: s.sender.name,
      to_name: s.receiver.name
    }));

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
