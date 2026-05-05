'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ExpenseWithDetails, GroupLeaderboardEntry, GroupWithDetails, SettlementRecord, SettlementTransaction, UserBalance } from '@/lib/types';

export type Tab = 'expenses' | 'balances' | 'settlements' | 'leaderboard' | 'members' | 'activity';

export function useGroupDetails(groupId: string, showToast: (msg: string, type: 'success' | 'error') => void) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupWithDetails | null>(null);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [leaderboard, setLeaderboard] = useState<GroupLeaderboardEntry[]>([]);
  const [settlements, setSettlements] = useState<SettlementTransaction[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<SettlementRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>('expenses');
  const [loading, setLoading] = useState(true);
  const [fetchingActivity, setFetchingActivity] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/details`);
      const data = await res.json();
      if (!res.ok) { router.push('/'); return; }
      setGroup(data.group);
      setExpenses(data.expenses ?? []);
      setBalances(data.balances ?? []);
      setLeaderboard(data.leaderboard ?? []);
      if (data.settlements) {
        setSettlements(data.settlements.plan ?? []);
        setSettlementRecords(data.settlements.settlements ?? []);
        setCurrentUserId(data.settlements.current_user_id ?? null);
      }
    } catch (err) {
      console.error("fetchAll error", err);
      showToast('Failed to load group data', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, router]);

  const fetchActivity = useCallback(async () => {
    setFetchingActivity(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/activity`);
      const data = await res.json();
      if (res.ok) setActivity(data.activity ?? []);
    } catch {
      showToast('Failed to load activity', 'error');
    } finally {
      setFetchingActivity(false);
    }
  }, [groupId, showToast]);

  useEffect(() => {
    if (groupId) void fetchAll();
  }, [groupId, fetchAll]);

  useEffect(() => {
    if (tab === 'activity') void fetchActivity();
  }, [tab, fetchActivity]);

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addMemberEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite member');
      setAddMemberEmail('');
      showToast('Invitation sent', 'success');
      void fetchAll();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to invite member', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const copyJoinCode = async () => {
    if (!group?.join_code) return;
    await navigator.clipboard?.writeText(group.join_code);
    showToast('Group code copied', 'success');
  };

  return {
    group, expenses, balances, leaderboard,
    settlements, settlementRecords, currentUserId,
    activity, tab, setTab, loading, fetchingActivity,
    addMemberEmail, setAddMemberEmail, addingMember,
    fetchAll, handleAddMember, copyJoinCode,
  };
}
