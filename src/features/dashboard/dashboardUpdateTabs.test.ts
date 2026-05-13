import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardUpdateTabCounts } from './dashboardUpdateTabs';

test('getDashboardUpdateTabCounts returns counts for dashboard update tabs', () => {
  const counts = getDashboardUpdateTabCounts({
    upcomingDues: [{ id: 'due-1' }, { id: 'due-2' }],
    notifications: [{ id: 'notification-1' }],
    recentActivity: [{ id: 'activity-1' }, { id: 'activity-2' }, { id: 'activity-3' }],
  });

  assert.deepEqual(counts, {
    dues: 2,
    notifications: 1,
    activity: 3,
  });
});
