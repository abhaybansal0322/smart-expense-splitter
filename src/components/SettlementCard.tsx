'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import { SettlementTransaction } from '@/lib/types';
import { Avatar } from './GroupComponents';

interface SettlementCardProps {
  transaction: SettlementTransaction;
  groupId: string;
  onConfirmed: () => void;
}

export function SettlementCard({ transaction, groupId, onConfirmed }: SettlementCardProps) {
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { show, ToastContainer } = useToast();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // First create the settlement record, then confirm it
      const createRes = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          from_user: transaction.from_user_id,
          to_user: transaction.to_user_id,
          amount: transaction.amount,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Failed to initiate settlement');

      const confirmRes = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: created.settlement_id,
          upi_reference: reference || undefined,
        }),
      });
      if (!confirmRes.ok) throw new Error('Failed to confirm settlement');

      setConfirmed(true);
      onConfirmed();
    } catch (err: any) {
      console.error(err);
      show(err.message || 'Settlement failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
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
        <span style={{ fontSize: 18 }}>✓</span>
        <span style={{ fontSize: 14, color: 'var(--accent-success)', fontWeight: 500 }}>
          {transaction.from_name} paid ₹{transaction.amount.toFixed(2)} to {transaction.to_name} — Settled!
        </span>
        <ToastContainer />
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
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        <Avatar name={transaction.from_name} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{transaction.from_name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→ pays →</span>
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
              ₹{transaction.amount.toFixed(2)}
            </span>
            {transaction.to_upi_id && (
              <span className="badge badge-purple" style={{ fontSize: 10 }}>UPI ✓</span>
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
            onClick={handleConfirm}
            disabled={loading}
            style={{ fontSize: 13, padding: '8px 14px' }}
          >
            {loading ? '...' : '✓ Confirm'}
          </button>
        </div>
      </div>

      {/* UPI reference input (shown when confirming) */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
        <input
          className="form-input"
          placeholder="UPI Reference / Transaction ID (optional)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          style={{ fontSize: 13 }}
        />
      </div>

      {/* QR Code section */}
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
            amount={transaction.amount}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Scan with any UPI app (Google Pay, PhonePe, Paytm, etc.)
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
              whiteSpace: 'pre-wrap',
            }}>
              {transaction.upi_link}
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

// Inline QR using a public API (no backend dep)
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
