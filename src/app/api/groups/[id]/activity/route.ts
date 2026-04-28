import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { isUserInGroup } from '@/services/groupService';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id: groupId } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isMember = await isUserInGroup(groupId, session.user.id);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const limit = 50;
    
    const { rows } = await query(
      `SELECT a.id, a.action, a.entity_type, a.metadata, a.created_at,
              json_build_object('id', u.id, 'name', u.name) as user
       FROM activity_logs a
       JOIN users u ON u.id = a.user_id
       WHERE a.group_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [groupId, limit]
    );

    return NextResponse.json({ activity: rows });
  } catch (error) {
    console.error('GET /api/groups/[id]/activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
