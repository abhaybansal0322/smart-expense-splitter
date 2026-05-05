import { NextRequest, NextResponse } from 'next/server';
import { getSettlementPlan } from '@/services/settlementService';
import { GroupRepository } from '@/db/repositories/GroupRepository';
import { SettlementRepository } from '@/db/repositories/SettlementRepository';
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

    const isMember = await GroupRepository.isUserInGroup(id, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    logger.info('Computing settlement plan', { request_id, user_id: session.user.id, group_id: id });

    const [plan, saved] = await Promise.all([
      getSettlementPlan(id),
      SettlementRepository.findByGroup(id),
    ]);

    const formattedSettlements = saved.map(s => ({
      id: s.id,
      from_user: s.fromUser,
      to_user: s.toUser,
      amount: Number(s.amount),
      status: s.status,
      created_at: s.createdAt,
      confirmed_at: s.confirmedAt,
      from_name: s.sender.name,
      to_name: s.receiver.name
    }));

    return NextResponse.json({ 
      plan, 
      settlements: formattedSettlements, 
      current_user_id: session.user.id 
    });
  } catch (error) {
    logger.error('GET /api/groups/[id]/settlements error', { request_id, group_id: id }, error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}
