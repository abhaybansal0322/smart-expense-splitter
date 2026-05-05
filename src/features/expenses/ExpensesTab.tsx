'use client';

import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { ExpenseWithDetails, User } from '@/lib/types';
import { formatIndianNumberCompact } from '@/lib/formatCurrency';

const SPLIT_TYPE_LABELS: Record<string, string> = {
  equal: 'Equal',
  exact: 'Exact',
  percentage: 'Percentage',
  exclude: 'Exclude',
  adjustment: 'Adjustment',
};

export function ExpensesTab({ expenses, members, groupId, onRefresh, showToast }: {
  expenses: ExpenseWithDetails[];
  members: User[];
  groupId: string;
  onRefresh: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
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

function ExpenseRow({ expense, onRefresh, showToast, onEdit }: {
  expense: ExpenseWithDetails;
  onRefresh: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  onEdit: () => void;
}) {
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
              {formatIndianNumberCompact(Number(expense.amount))}
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
            {(expense.spotify_track || expense.attachments?.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                {expense.spotify_track && (
                  <a
                    href={expense.spotify_track.spotify_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      borderRadius: 12, border: '1px solid rgba(34, 211, 160, 0.25)',
                      background: 'rgba(34, 211, 160, 0.08)', textDecoration: 'none', color: 'var(--text-primary)',
                    }}
                  >
                    {expense.spotify_track.album_image_url && (
                      <span
                        aria-hidden="true"
                        style={{ width: 48, height: 48, borderRadius: 8, backgroundImage: `url(${expense.spotify_track.album_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700 }}>Spotify vibe</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{expense.spotify_track.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{expense.spotify_track.artist}</div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700 }}>Open</span>
                  </a>
                )}
                {expense.attachments?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                    {expense.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                        <span
                          aria-label={attachment.original_name}
                          style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', backgroundImage: `url(${attachment.file_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 10, border: '1px solid var(--border)' }}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{formatIndianNumberCompact(Number(split.share))}</span>
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
