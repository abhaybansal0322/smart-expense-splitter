'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatPill } from '@/components/StatPill';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { useToast } from '@/components/Toast';
import { useGroupDetails, Tab } from '@/hooks/useGroupDetails';
import { ExpensesTab } from '@/features/expenses/ExpensesTab';
import { BalancesTab } from '@/features/balances/BalancesTab';
import { SettlementsTab } from '@/features/settlements/SettlementsTab';
import { LeaderboardTab } from '@/features/leaderboard/LeaderboardTab';
import { MembersTab } from '@/features/members/MembersTab';
import { ActivityTab } from '@/features/activity/ActivityTab';

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { show, ToastContainer } = useToast();
  const [showAddExpense, setShowAddExpense] = useState(false);

  const {
    group, expenses, balances, leaderboard,
    settlements, settlementRecords, currentUserId,
    activity, tab, setTab, loading, fetchingActivity,
    addMemberEmail, setAddMemberEmail, addingMember,
    fetchAll, handleAddMember, copyJoinCode,
  } = useGroupDetails(groupId, show);

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
          <div className="skeleton" style={{ height: 36, width: 300, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 20, width: 200, marginBottom: 40 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
          </div>
        </main>
      </>
    );
  }

  if (!group) return null;
  const members = Array.isArray(group.members) ? group.members : [];

  const TAB_LIST: { id: Tab; label: string; count?: number }[] = [
    { id: 'expenses', label: 'Expenses', count: expenses.length },
    { id: 'balances', label: 'Balances', count: balances.length },
    { id: 'settlements', label: 'Settle Up', count: settlements.length },
    { id: 'leaderboard', label: 'Leaderboard', count: leaderboard.length },
    { id: 'members', label: 'Members', count: members.length },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>← Back to Dashboard</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }} className="animate-fade-in">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>{group.name}</h1>
            {group.description && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{group.description}</p>}
            {group.join_code && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group Code</span>
                <span style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--accent-primary)', fontWeight: 800, letterSpacing: 1 }}>{group.join_code}</span>
                <button className="btn-secondary" onClick={copyJoinCode} style={{ padding: '6px 12px', fontSize: 12 }}>Copy</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <StatPill label="Members" value={members.length} />
              <StatPill label="Total Spent" value={`₹${(group.total_expenses ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
              <StatPill label="Settle Up" value={`${settlements.length} txn`} highlight={settlements.length > 0} />
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowAddExpense(true)} style={{ padding: '12px 22px' }}>+ Add Expense</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {TAB_LIST.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 18px', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--accent-primary)' : 'transparent'}`, background: 'none', color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{ background: tab === t.id ? 'var(--accent-primary)' : 'var(--bg-elevated)', color: tab === t.id ? 'white' : 'var(--text-muted)', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in" key={tab}>
          {tab === 'expenses' && <ExpensesTab expenses={expenses} members={members} groupId={groupId} onRefresh={fetchAll} showToast={show} />}
          {tab === 'balances' && <BalancesTab balances={balances} />}
          {tab === 'settlements' && <SettlementsTab settlements={settlements} settlementRecords={settlementRecords} groupId={groupId} currentUserId={currentUserId} onChanged={fetchAll} showToast={show} />}
          {tab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} />}
          {tab === 'members' && <MembersTab members={members} addMemberEmail={addMemberEmail} setAddMemberEmail={setAddMemberEmail} onAddMember={handleAddMember} addingMember={addingMember} />}
          {tab === 'activity' && <ActivityTab activity={activity} loading={fetchingActivity} />}
        </div>
      </main>

      {showAddExpense && (
        <AddExpenseModal groupId={groupId} members={members} onClose={() => setShowAddExpense(false)} onCreated={() => { setShowAddExpense(false); show('Expense added!', 'success'); fetchAll(); setTab('expenses'); }} />
      )}
      <ToastContainer />
    </>
  );
}
