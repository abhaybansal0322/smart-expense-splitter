'use client';

import { useState } from 'react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

interface JoinGroupModalProps {
  onClose: () => void;
  onJoined: (groupId: string) => void;
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
  const [createdGroup, setCreatedGroup] = useState<{ groupId: string; joinCode: string } | null>(null);
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
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, memberEmails: emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      setCreatedGroup({ groupId: data.groupId, joinCode: data.joinCode });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = async () => {
    if (!createdGroup) return;
    await navigator.clipboard?.writeText(createdGroup.joinCode);
  };

  if (createdGroup) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Group Created</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Share this code so others can join</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>x</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '18px',
                textAlign: 'center',
                background: 'var(--bg-elevated)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Group code</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>{createdGroup.joinCode}</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={copyJoinCode} style={{ flex: 1 }}>Copy Code</button>
              <button className="btn-primary" onClick={() => onCreated(createdGroup.groupId)} style={{ flex: 1 }}>Open Group</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create New Group</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Invite by email now or share the group code later</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>x</button>
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
            <label className="form-label">Invite Existing Members by Email</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="existing-user@example.com"
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
                    x
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
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JoinGroupModal({ onClose, onJoined }: JoinGroupModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return setError('Enter a group code');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join group');
      onJoined(data.groupId);
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
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Join Group</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Enter the code shared by a group member</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>x</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Group Code</label>
            <input
              className="form-input"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--accent-danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
