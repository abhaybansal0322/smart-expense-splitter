'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Avatar } from '@/components/GroupComponents';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { SettlementCard } from '@/components/SettlementCard';
import { useToast } from '@/components/Toast';
import { GroupWithDetails, ExpenseWithDetails, UserBalance, SettlementTransaction } from '@/lib/types';

type Tab = 'expenses' | 'balances' | 'settlements' | 'members';

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
  const [tab, setTab] = useState<Tab>('expenses');
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const { show, ToastContainer } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const [groupRes, expRes, balRes, setRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/expenses/group/${groupId}`),
        fetch(`/api/groups/${groupId}/balances`),
        fetch(`/api/groups/${groupId}/settlements`),
      ]);
      const [gd, ed, bd, sd] = await Promise.all([
        groupRes.json(), expRes.json(), balRes.json(), setRes.json(),
      ]);
      if (!groupRes.ok) { router.push('/'); return; }
      setGroup(gd.group);
      setExpenses(ed.expenses ?? []);
      setBalances(bd.balances ?? []);
      setSettlements(sd.plan ?? []);
    } catch {
      show('Failed to load group data', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addMemberEmail }),
      });
      if (!res.ok) throw new Error('Failed');
      setAddMemberEmail('');
      show('Member added!', 'success');
      fetchAll();
    } catch {
      show('Failed to add member', 'error');
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
            <ExpensesTab expenses={expenses} onRefresh={fetchAll} />
          )}
          {tab === 'balances' && (
            <BalancesTab balances={balances} />
          )}
          {tab === 'settlements' && (
            <SettlementsTab settlements={settlements} groupId={groupId} onSettled={fetchAll} />
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

function ExpensesTab({ expenses, onRefresh }: { expenses: ExpenseWithDetails[]; onRefresh: () => void }) {
  if (expenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
        <p>No expenses yet. Add the first one!</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {expenses.map((exp) => (
        <ExpenseRow key={exp.id} expense={exp} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

function ExpenseRow({ expense, onRefresh }: { expense: ExpenseWithDetails; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    setDeleting(true);
    try {
      // Not implemented in route yet — would DELETE /api/expenses/[id]
      onRefresh();
    } finally {
      setDeleting(false);
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
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Split Breakdown
            </p>
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
  settlements, groupId, onSettled,
}: { settlements: SettlementTransaction[]; groupId: string; onSettled: () => void }) {
  if (settlements.length === 0) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 20px', background: 'rgba(124,111,255,0.08)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 12 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Optimized Settlement Plan</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {settlements.length} transaction{settlements.length !== 1 ? 's' : ''} needed to settle all debts (minimized via greedy algorithm)
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {settlements.map((txn, i) => (
          <SettlementCard key={i} transaction={txn} groupId={groupId} onConfirmed={onSettled} />
        ))}
      </div>
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
      {/* Add member */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add Member</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            placeholder="friend@example.com"
            value={addMemberEmail}
            onChange={(e) => setAddMemberEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddMember()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={onAddMember} disabled={addingMember} style={{ flexShrink: 0 }}>
            {addingMember ? '...' : 'Add'}
          </button>
        </div>
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
