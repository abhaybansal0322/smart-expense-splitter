// ─────────────── API Handler Middleware ───────────────
// Higher-order functions that eliminate boilerplate from API routes.
// Handles: authentication, request ID, structured logging, error handling.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { isUserInGroup } from '@/services/groupService';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface AuthenticatedRequest {
  req: NextRequest;
  userId: string;
  userEmail: string;
  requestId: string;
}

export interface GroupAccessRequest extends AuthenticatedRequest {
  groupId: string;
}

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Wraps a route handler with authentication and error handling.
 */
export function withAuth(
  handler: (ctx: AuthenticatedRequest) => Promise<NextResponse>,
  routeName?: string
) {
  return async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    try {
      const session = await getAuthSession();
      if (!session?.user?.id || !session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return await handler({ 
        req, 
        userId: session.user.id, 
        userEmail: session.user.email,
        requestId 
      });
    } catch (error) {
      logger.error(`${routeName ?? req.nextUrl.pathname} error`, { requestId }, error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * Wraps a route handler with authentication + group membership check.
 */
export function withGroupAccess(
  handler: (ctx: GroupAccessRequest) => Promise<NextResponse>,
  routeName?: string
) {
  return async (req: NextRequest, { params }: RouteParams) => {
    const requestId = crypto.randomUUID();
    const { id: groupId } = await params;
    try {
      const session = await getAuthSession();
      if (!session?.user?.id || !session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const isMember = await isUserInGroup(groupId, session.user.id);
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return await handler({ 
        req, 
        userId: session.user.id, 
        userEmail: session.user.email,
        requestId, 
        groupId 
      });
    } catch (error) {
      logger.error(`${routeName ?? req.nextUrl.pathname} error`, { requestId, groupId }, error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
