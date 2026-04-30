'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Avatar } from '@/components/GroupComponents';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { PendingSettlementCard, SettlementCard } from '@/components/SettlementCard';
import { useToast } from '@/components/Toast';
import { Activity, ExpenseWithDetails, GroupWithDetails, SettlementRecord, SettlementTransaction, User, UserBalance } from '@/lib/types';

type Tab = 'expenses' | 'balances' | 'settlements' | 'members' | 'activity';

const SPLIT_TYPE_LABELS: Record<string, string> = {
  equal: 'Equal',
  exact: 'Exact',
  percentage: 'Percentage',
  exclude: 'Exclude',
};

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupWithDetails | null>(null);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [settlements, setSettlements] = useState<SettlementTransaction[]>([]);
  const [settlementRecords, setSettlementRecords] = useState<SettlementRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>('expenses');
  const [loading, setLoading] = useState(true);
  const [fetchingActivity, setFetchingActivity] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const { show, ToastContainer } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/details`);
      const data = await res.json();
      if (!res.ok) { router.push('/'); return; }
      
      setGroup(data.group);
      setExpenses(data.expenses ?? []);
      setBalances(data.balances ?? []);
      
      if (data.settlements) {
        setSettlements(data.settlements.plan ?? []);
        setSettlementRecords(data.settlements.settlements ?? []);
        setCurrentUserId(data.settlements.current_user_id ?? null);
      }
    } catch (err) {
      console.error("fetchAll error", err);
      show('Failed to load group data', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, show, router]);

  const fetchActivity = useCallback(async () => {
    setFetchingActivity(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/activity`);
      const data = await res.json();
      if (res.ok) {
        setActivity(data.activity ?? []);
      }
    } catch {
      show('Failed to load activity', 'error');
    } finally {
      setFetchingActivity(false);
    }
  }, [groupId, show]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (groupId) void fetchAll();
  }, [groupId, fetchAll]);

  useEffect(() => {
    if (tab === 'activity') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchActivity();
    }
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
      show('Invitation sent', 'success');
      void fetchAll();
    } catch (error) {
      show(error instanceof Error ? error.message : 'Failed to invite member', 'error');
    } finally {
      setAddingMember(false);
    }
  };

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
    { id: 'members', label: 'Members', count: members.length },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Back + Header */}
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }} className="animate-fade-in">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>{group.name}</h1>
            {group.description && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{group.description}</p>}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <StatPill label="Members" value={members.length} />
              <StatPill label="Total Spent" value={`₹${(group.total_expenses ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
              <StatPill label="Settle Up" value={`${settlements.length} txn`} highlight={settlements.length > 0} />
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowAddExpense(true)} style={{ padding: '12px 22px' }}>
            + Add Expense
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {TAB_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent-primary)' : 'transparent'}`,
                background: 'none',
                color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: tab === t.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{
                  background: tab === t.id ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: tab === t.id ? 'white' : 'var(--text-muted)',
                  borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in" key={tab}>
          {tab === 'expenses' && (
            <ExpensesTab expenses={expenses} members={members} groupId={groupId} onRefresh={fetchAll} showToast={show} />
          )}
          {tab === 'balances' && (
            <BalancesTab balances={balances} />
          )}
          {tab === 'settlements' && (
            <SettlementsTab
              settlements={settlements}
              settlementRecords={settlementRecords}
              groupId={groupId}
              currentUserId={currentUserId}
              onChanged={fetchAll}
              showToast={show}
            />
          )}
          {tab === 'members' && (
            <MembersTab
              members={members}
              addMemberEmail={addMemberEmail}
              setAddMemberEmail={setAddMemberEmail}
              onAddMember={handleAddMember}
              addingMember={addingMember}
            />
          )}
          {tab === 'activity' && (
            <ActivityTab activity={activity} loading={fetchingActivity} />
          )}
        </div>
      </main>

      {showAddExpense && (
        <AddExpenseModal
          groupId={groupId}
          members={members}
          onClose={() => setShowAddExpense(false)}
          onCreated={() => {
            setShowAddExpense(false);
            show('Expense added!', 'success');
            fetchAll();
            setTab('expenses');
          }}
        />
      )}
      <ToastContainer />
    </>
  );
}

// ─── Sub-components ───

function StatPill({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{
      padding: '4px 14px',
      borderRadius: 20,
      background: highlight ? 'rgba(245,158,11,0.12)' : 'var(--bg-elevated)',
      border: `1px solid ${highlight ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
      fontSize: 13,
      color: highlight ? 'var(--accent-warning)' : 'var(--text-muted)',
    }}>
      <span style={{ fontWeight: 600, color: highlight ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{value}</span>
      {' '}{label}
    </div>
  );
}

function ExpensesTab({ expenses, members, groupId, onRefresh, showToast }: { expenses: ExpenseWithDetails[]; members: User[]; groupId: string; onRefresh: () => void; showToast: (msg: string, type: 'success' | 'error') => void; }) {
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);

  if (expenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
        <p>No expenses yet. Add the first one!</p>
      </div>
    );
  }
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {expenses.map((exp) => (
          <ExpenseRow key={exp.id} expense={exp} onRefresh={onRefresh} showToast={showToast} onEdit={() => setEditingExpense(exp)} />
        ))}
      </div>
      {editingExpense && (
        <AddExpenseModal
          groupId={groupId}
          members={members}
          initialExpense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onCreated={() => {
            setEditingExpense(null);
            showToast('Expense updated!', 'success');
            onRefresh();
          }}
        />
      )}
    </>
  );
}

function ExpenseRow({ expense, onRefresh, showToast, onEdit }: { expense: ExpenseWithDetails; onRefresh: () => void; showToast: (msg: string, type: 'success' | 'error') => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
      showToast('Expense deleted', 'success');
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete expense';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const splits = Array.isArray(expense.splits) ? expense.splits : [];

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(124,111,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
        }}>
          💸
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{expense.description}</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', flexShrink: 0, marginLeft: 12 }}>
              ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Paid by <span style={{ color: 'var(--accent-secondary)' }}>{expense.paid_by_name}</span></span>
            <span className="badge badge-purple" style={{ fontSize: 10 }}>{SPLIT_TYPE_LABELS[expense.split_type]}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Split Breakdown
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onEdit} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Edit</button>
                <button onClick={() => setShowConfirm(true)} className="btn-danger" style={{ padding: '4px 10px', fontSize: 12, background: 'rgba(248, 113, 113, 0.1)' }}>Delete</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {splits.map((split) => (
                <div key={split.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={split.user_name} size={28} />
                    <span style={{ fontSize: 14 }}>{split.user_name}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>₹{Number(split.share).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !deleting && setShowConfirm(false)}>
          <div className="modal-content" style={{ maxWidth: 400, padding: 24, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Delete Expense?</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Are you sure you want to delete this expense? This action cannot be undone and will affect everyone&apos;s balances.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setShowConfirm(false)} disabled={deleting} style={{ flex: 1, justifyContent: 'center' }}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1, justifyContent: 'center', background: 'rgba(248, 113, 113, 0.15)' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BalancesTab({ balances }: { balances: UserBalance[] }) {
  if (balances.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No balance data yet</div>;
  }

  const max = Math.max(...balances.map((b) => Math.abs(b.net_balance)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {balances.map((b) => {
        const isPositive = b.net_balance >= 0;
        const barWidth = Math.abs(b.net_balance) / max;

        return (
          <div key={b.user_id} className="glass-card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <Avatar name={b.name} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 20, fontWeight: 800,
                  color: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)',
                }}>
                  {isPositive ? '+' : ''}₹{Math.abs(b.net_balance).toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isPositive ? 'is owed' : 'owes'}
                </div>
              </div>
            </div>
            {/* Balance bar */}
            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${barWidth * 100}%`,
                background: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)',
                borderRadius: 3, transition: 'width 0.5s ease',
              }} />
            </div>
            {b.upi_id && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                UPI: <span style={{ color: 'var(--accent-primary)' }}>{b.upi_id}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SettlementsTab({
  settlements,
  settlementRecords,
  groupId,
  currentUserId,
  onChanged,
  showToast,
}: {
  settlements: SettlementTransaction[];
  settlementRecords: SettlementRecord[];
  groupId: string;
  currentUserId: string | null;
  onChanged: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const pendingRecords = settlementRecords.filter((record) => record.status === 'pending');
  const historyRecords = settlementRecords.filter((record) => record.status !== 'pending').slice(0, 8);
  const actionableSettlements = settlements.filter(
    (txn) => !pendingRecords.some(
      (record) => record.from_user === txn.from_user_id && record.to_user === txn.to_user_id
    )
  );
  if (actionableSettlements.length === 0 && pendingRecords.length === 0 && historyRecords.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All settled up!</h3>
        <p style={{ color: 'var(--text-muted)' }}>No pending transactions in this group</p>
      </div>
    );
  }

  return (
    <div>
      {pendingRecords.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending Confirmations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingRecords.map((record) => (
              <PendingSettlementCard
                key={record.id}
                settlement={record}
                currentUserId={currentUserId}
                onChanged={onChanged}
                onError={(message) => showToast(message, 'error')}
              />
            ))}
          </div>
        </section>
      )}
      {actionableSettlements.length > 0 && (
        <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 20px', background: 'rgba(124,111,255,0.08)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 12 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Optimized Settlement Plan</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Enter any amount up to the suggested amount. The receiver must confirm before balances change.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {actionableSettlements.map((txn, i) => (
          <SettlementCard
            key={`${txn.from_user_id}-${txn.to_user_id}-${i}`}
            transaction={txn}
            groupId={groupId}
            currentUserId={currentUserId}
            onChanged={onChanged}
            onError={(message) => showToast(message, 'error')}
          />
        ))}
      </div>
        </>
      )}
      {historyRecords.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Settlement History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historyRecords.map((record) => (
              <div key={record.id} className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14 }}>
                    <strong>{record.from_name}</strong> paid <strong>{record.to_name}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(record.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }}>Rs. {record.amount.toFixed(2)}</div>
                  <span className={record.status === 'confirmed' ? 'badge badge-green' : 'badge badge-red'}>
                    {record.status === 'confirmed' ? 'Confirmed' : 'Rejected'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MembersTab({
  members, addMemberEmail, setAddMemberEmail, onAddMember, addingMember,
}: {
  members: GroupWithDetails['members'];
  addMemberEmail: string;
  setAddMemberEmail: (v: string) => void;
  onAddMember: () => void;
  addingMember: boolean;
}) {
  return (
    <div>
      {/* Invite member */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Invite Member</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            placeholder="existing-user@example.com"
            value={addMemberEmail}
            onChange={(e) => setAddMemberEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddMember()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={onAddMember} disabled={addingMember} style={{ flexShrink: 0 }}>
            {addingMember ? '...' : 'Invite'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          The user must already have an account. They will join after accepting the invitation.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((m) => (
          <div key={m.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={m.name} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.email}</div>
            </div>
            {m.upi_id && (
              <span className="badge badge-green" style={{ fontSize: 11 }}>
                UPI ✓
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTab({ activity, loading }: { activity: Activity[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: '30%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📜</div>
        <p>No activity yet in this group.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 86400 * 7) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderActivityText = (a: Activity) => {
    const userName = <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.user.name}</span>;
    const amount = Number(a.metadata.amount ?? 0);
    const oldAmount = Number(a.metadata.old_amount ?? 0);
    const newAmount = Number(a.metadata.new_amount ?? 0);
    const description = String(a.metadata.description ?? 'expense');

    switch (a.action) {
      case 'EXPENSE_CREATED':
        return (
          <>
            {userName} added {description} <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatCurrency(amount)}</span>
          </>
        );
      case 'EXPENSE_UPDATED':
        return (
          <>
            {userName} updated expense from <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatCurrency(oldAmount)}</span> → <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{formatCurrency(newAmount)}</span>
          </>
        );
      case 'EXPENSE_DELETED':
        return (
          <>
            {userName} deleted {description} ({formatCurrency(amount)})
          </>
        );
      case 'SETTLEMENT_CREATED':
        return (
          <>
            {userName} paid <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{formatCurrency(amount)}</span>
          </>
        );
      default:
        return `${a.user.name} performed an action`;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        background: 'var(--border)',
        marginLeft: 9
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {activity.map((a) => (
          <div key={a.id} style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Timeline dot */}
            <div style={{
              position: 'absolute',
              left: -20,
              top: 6,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              border: '2px solid var(--bg-primary)',
              zIndex: 1
            }} />

            <Avatar name={a.user.name} size={32} />

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {renderActivityText(a)}
              </p>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                {getRelativeTime(a.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
