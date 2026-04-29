'use client';

import { useState } from 'react';
import { SettlementRecord, SettlementTransaction } from '@/lib/types';
import { Avatar } from './GroupComponents';

interface SettlementCardProps {
  transaction: SettlementTransaction;
  groupId: string;
  currentUserId: string | null;
  onChanged: () => void;
  onError: (message: string) => void;
}

interface PendingSettlementCardProps {
  settlement: SettlementRecord;
  currentUserId: string | null;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function SettlementCard({
  transaction,
  groupId,
  currentUserId,
  onChanged,
  onError,
}: SettlementCardProps) {
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [reference, setReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(transaction.amount.toFixed(2));
  const [requestSent, setRequestSent] = useState(false);
  const canRecordPayment = currentUserId === transaction.from_user_id;

  const handleCreateRequest = async () => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      onError('Enter a valid settlement amount');
      return;
    }
    if (amount - transaction.amount > 0.005) {
      onError('Partial payment cannot exceed the suggested settlement amount');
      return;
    }

    setLoading(true);
    try {
      const createRes = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          from_user: transaction.from_user_id,
          to_user: transaction.to_user_id,
          amount,
          upi_reference: reference || undefined,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to record payment');

      setRequestSent(true);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderRadius: 12,
        background: 'rgba(34,211,160,0.08)',
        border: '1px solid rgba(34,211,160,0.2)',
      }}>
        <span style={{ fontSize: 18 }}>OK</span>
        <span style={{ fontSize: 14, color: 'var(--accent-success)', fontWeight: 500 }}>
          Payment request sent to {transaction.to_name} for confirmation.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--bg-card)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        <Avatar name={transaction.from_name} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{transaction.from_name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>pays</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{transaction.to_name}</span>
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 22,
              fontWeight: 800,
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Rs. {transaction.amount.toFixed(2)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>suggested</span>
            {transaction.to_upi_id && (
              <span className="badge badge-purple" style={{ fontSize: 10 }}>UPI</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {transaction.upi_link && (
            <a
              href={transaction.upi_link}
              className="btn-primary"
              style={{ fontSize: 13, padding: '8px 14px', textDecoration: 'none' }}
            >
              Pay via UPI
            </a>
          )}
          {transaction.to_upi_id && (
            <button
              className="btn-secondary"
              onClick={() => setShowQr(!showQr)}
              style={{ fontSize: 13, padding: '8px 14px' }}
            >
              QR
            </button>
          )}
          <button
            className="btn-success"
            onClick={handleCreateRequest}
            disabled={loading || !canRecordPayment}
            style={{ fontSize: 13, padding: '8px 14px' }}
            title={canRecordPayment ? 'Send a payment request for receiver confirmation' : 'Only the payer can record this payment'}
          >
            {loading ? '...' : 'Record Payment'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
        <input
          className="form-input"
          type="number"
          min="0.01"
          max={transaction.amount}
          step="0.01"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          disabled={!canRecordPayment}
          style={{ fontSize: 13 }}
        />
        <input
          className="form-input"
          placeholder="UPI Reference / Transaction ID (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          disabled={!canRecordPayment}
          style={{ fontSize: 13 }}
        />
      </div>

      {showQr && transaction.to_upi_id && (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
        }}>
          <QrCodeDisplay
            upiId={transaction.to_upi_id}
            name={transaction.to_name}
            amount={Number(paymentAmount) || transaction.amount}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Scan with any UPI app, then record the paid amount here.
            </p>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}>
              {transaction.upi_link}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PendingSettlementCard({
  settlement,
  currentUserId,
  onChanged,
  onError,
}: PendingSettlementCardProps) {
  const [loadingAction, setLoadingAction] = useState<'confirm' | 'reject' | null>(null);
  const canRespond = currentUserId === settlement.to_user;
  const isPayer = currentUserId === settlement.from_user;

  const respond = async (action: 'confirm' | 'reject') => {
    setLoadingAction(action);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: settlement.id,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment');
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to update payment');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={{
      borderRadius: 14,
      border: '1px solid rgba(245,158,11,0.35)',
      background: 'var(--bg-card)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <Avatar name={settlement.from_name} size={40} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{settlement.from_name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>marked payment to</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{settlement.to_name}</span>
          <span className="badge badge-yellow" style={{ fontSize: 10 }}>Pending confirmation</span>
        </div>
        <div style={{ marginTop: 4, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-warning)' }}>
            Rs. {settlement.amount.toFixed(2)}
          </span>
          {settlement.upi_reference && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ref: {settlement.upi_reference}</span>
          )}
          {isPayer && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Waiting for {settlement.to_name}</span>
          )}
        </div>
      </div>

      {canRespond && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-danger"
            onClick={() => respond('reject')}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            className="btn-success"
            onClick={() => respond('confirm')}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'confirm' ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}

function QrCodeDisplay({ upiId, name, amount }: { upiId: string; name: string; amount: number }) {
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}&bgcolor=12121a&color=7c6fff&qzone=1`;

  return (
    <div style={{
      padding: 8,
      background: 'white',
      borderRadius: 12,
      flexShrink: 0,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrUrl} alt="UPI QR Code" width={130} height={130} style={{ display: 'block', borderRadius: 8 }} />
    </div>
  );
}
