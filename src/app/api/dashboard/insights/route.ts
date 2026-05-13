import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import { getDashboardInsights } from '@/services/dashboardInsightsService';

export const GET = withAuth(async ({ userId }) => {
  const insights = await getDashboardInsights(userId);
  return NextResponse.json({ insights });
}, 'GET /api/dashboard/insights');
