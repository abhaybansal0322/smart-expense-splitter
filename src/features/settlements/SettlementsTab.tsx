'use client';

import { PendingSettlementCard, SettlementCard } from '@/components/SettlementCard';
import { SettlementRecord, SettlementTransaction } from '@/lib/types';
import { formatIndianNumberCompact } from '@/lib/formatCurrency';

export function SettlementsTab({
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
                  <div style={{ fontWeight: 800 }}>{formatIndianNumberCompact(record.amount)}</div>
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
