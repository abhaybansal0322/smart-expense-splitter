'use client';

import { useCallback, useEffect, useState } from 'react';
import { GroupInvitation, GroupWithDetails } from '@/lib/types';

export function useDashboard(showToast: (msg: string, type: 'success' | 'error') => void) {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingInvitation, setUpdatingInvitation] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, invitationsRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/group-invitations'),
      ]);
      const [groupsData, invitationsData] = await Promise.all([
        groupsRes.json(),
        invitationsRes.json(),
      ]);
      setGroups(groupsData.groups ?? []);
      setInvitations(invitationsData.invitations ?? []);
    } catch {
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const respondToInvitation = async (groupId: string, action: 'accept' | 'decline') => {
    setUpdatingInvitation(groupId);
    try {
      const res = await fetch('/api/group-invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update invitation');
      showToast(action === 'accept' ? 'Invitation accepted' : 'Invitation declined', 'success');
      await fetchDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update invitation', 'error');
    } finally {
      setUpdatingInvitation(null);
    }
  };

  return {
    groups,
    invitations,
    loading,
    updatingInvitation,
    fetchDashboard,
    respondToInvitation,
  };
}
