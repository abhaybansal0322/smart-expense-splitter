'use client';

import { useState } from 'react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

const AVATAR_COLORS = [
  '#7c6fff', '#5b8ff9', '#22d3a0', '#f59e0b', '#f87171',
  '#a78bfa', '#34d399', '#60a5fa', '#fb923c', '#e879f9',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = getAvatarColor(name);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}22`,
        border: `2px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e.includes('@')) return setError('Enter a valid email');
    if (emails.includes(e)) return setError('Email already added');
    setEmails([...emails, e]);
    setEmailInput('');
    setError('');
  };

  const removeEmail = (email: string) => setEmails(emails.filter((e) => e !== email));

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Group name is required');
    if (emails.length === 0) return setError('Add at least one member');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, memberEmails: emails }),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMsg = 'Failed to create group';
        if (typeof data.error === 'string') {
          errorMsg = data.error;
        } else if (data.error?.fieldErrors) {
          // Flatten field errors into a single string for simplicity in the UI
          const errors = data.error.fieldErrors;
          errorMsg = Object.values(errors).flat().join(', ');
        }

        if (errorMsg.toLowerCase().includes('does not exist')) {
          throw new Error('One or more users must sign up before being added');
        }
        throw new Error(errorMsg);
      }
      onCreated(data.groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create New Group</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Invite friends to split expenses</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Group Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Goa Trip 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div>
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="What's this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Add Members by Email *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="friend@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={addEmail} style={{ flexShrink: 0, padding: '10px 16px' }}>
                Add
              </button>
            </div>
          </div>

          {emails.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {emails.map((email) => (
                <div
                  key={email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13,
                  }}
                >
                  <Avatar name={email} size={24} />
                  <span style={{ color: 'var(--text-secondary)' }}>{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--accent-danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
              {loading ? <span className="animate-spin" style={{ display: 'inline-block' }}>◌</span> : null}
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
