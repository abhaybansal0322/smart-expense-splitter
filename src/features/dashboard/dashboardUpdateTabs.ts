export type DashboardUpdateTab = 'dues' | 'notifications' | 'activity';

export const DASHBOARD_UPDATE_TABS: Array<{
  id: DashboardUpdateTab;
  label: string;
}> = [
  { id: 'dues', label: 'Upcoming Dues' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'activity', label: 'Recent Activity' },
];

export function getDashboardUpdateTabCounts(params: {
  upcomingDues: Array<unknown>;
  notifications: Array<unknown>;
  recentActivity: Array<unknown>;
}): Record<DashboardUpdateTab, number> {
  return {
    dues: params.upcomingDues.length,
    notifications: params.notifications.length,
    activity: params.recentActivity.length,
  };
}
