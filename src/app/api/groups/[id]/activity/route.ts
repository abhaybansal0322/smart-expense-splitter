import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { activityLogs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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
    
    const rows = await db.query.activityLogs.findMany({
      where: eq(activityLogs.groupId, groupId),
      with: {
        user: {
          columns: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [desc(activityLogs.createdAt)],
      limit: limit
    });

    return NextResponse.json({ activity: rows });
  } catch (error) {
    console.error('GET /api/groups/[id]/activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
