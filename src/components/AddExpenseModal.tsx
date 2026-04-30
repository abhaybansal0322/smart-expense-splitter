'use client';

import { useState } from 'react';
import { User, SplitType, ExpenseWithDetails, ExpenseSpotifyTrack } from '@/lib/types';

interface AddExpenseModalProps {
  groupId: string;
  members: User[];
  onClose: () => void;
  onCreated: () => void;
  initialExpense?: ExpenseWithDetails;
}

const SPLIT_TYPES: { value: SplitType; label: string; desc: string }[] = [
  { value: 'equal', label: 'Equal', desc: 'Split evenly among all' },
  { value: 'adjustment', label: 'Itemized', desc: 'Add extra amounts (e.g. drinks)' },
  { value: 'exact', label: 'Exact', desc: 'Specify exact amounts' },
  { value: 'percentage', label: 'Percentage', desc: 'Split by percentage' },
  { value: 'exclude', label: 'Exclude', desc: 'Exclude specific users' },
];

export function AddExpenseModal({ groupId, members, onClose, onCreated, initialExpense }: AddExpenseModalProps) {
  const [description, setDescription] = useState(initialExpense?.description ?? '');
  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '');
  const [paidBy, setPaidBy] = useState(initialExpense?.paid_by ?? members[0]?.id ?? '');
  const [splitType, setSplitType] = useState<SplitType>(initialExpense?.split_type ?? 'equal');

  const [participants, setParticipants] = useState<string[]>(
    initialExpense
      ? initialExpense.splits.map(s => s.user_id)
      : members.map((m) => m.id)
  );

  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    if (initialExpense?.split_type === 'exact') {
      const map: Record<string, string> = {};
      initialExpense.splits.forEach(s => {
        map[s.user_id] = String(s.share);
      });
      return map;
    }
    return {};
  });

  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    if (initialExpense?.split_type === 'percentage') {
      const map: Record<string, string> = {};
      const total = Number(initialExpense.amount);
      if (total > 0) {
        initialExpense.splits.forEach(s => {
          map[s.user_id] = String(((Number(s.share) / total) * 100).toFixed(2));
        });
      }
      return map;
    }
    return {};
  });

  const [excludedUsers, setExcludedUsers] = useState<string[]>(() => {
    if (initialExpense?.split_type === 'exclude') {
      const pIds = initialExpense.splits.map(s => s.user_id);
      return members.map(m => m.id).filter(id => !pIds.includes(id));
    }
    return [];
  });
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<ExpenseSpotifyTrack[]>([]);
  const [selectedSpotifyTrack, setSelectedSpotifyTrack] = useState<ExpenseSpotifyTrack | null>(initialExpense?.spotify_track ?? null);
  const [searchingSpotify, setSearchingSpotify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleParticipant = (uid: string) => {
    setParticipants((prev) =>
      prev.includes(uid) ? prev.filter((p) => p !== uid) : [...prev, uid]
    );
  };

  const totalAmt = parseFloat(amount) || 0;

  // Compute exact total for validation display
  const exactTotal = Object.values(exactAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const pctTotal = Object.values(percentages).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const adjTotal = Object.values(adjustments).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const remainingForEqual = totalAmt - adjTotal;

  const handleSubmit = async () => {
    setError('');
    if (!description.trim()) return setError('Description is required');
    if (totalAmt <= 0) return setError('Enter a valid amount');
    if (!paidBy) return setError('Select who paid');
    if (participants.length === 0) return setError('Select at least one participant');

    const payload: Record<string, unknown> = {
      group_id: groupId,
      paid_by: paidBy,
      amount: totalAmt,
      description,
      split_type: splitType,
      participants,
    };

    if (splitType === 'exact') {
      const exactMap: Record<string, number> = {};
      for (const uid of participants) {
        exactMap[uid] = parseFloat(exactAmounts[uid] || '0');
      }
      payload.exact_amounts = exactMap;
    }

    if (splitType === 'percentage') {
      const pctMap: Record<string, number> = {};
      for (const uid of participants) {
        pctMap[uid] = parseFloat(percentages[uid] || '0');
      }
      payload.percentages = pctMap;
    }

    if (splitType === 'exclude') {
      payload.excluded_users = excludedUsers;
    }

    if (splitType === 'adjustment') {
      const adjMap: Record<string, number> = {};
      for (const uid of participants) {
        adjMap[uid] = parseFloat(adjustments[uid] || '0');
      }
      payload.adjustments = adjMap;
      if (adjTotal > totalAmt) return setError(`Total extra amounts (₹${adjTotal}) cannot exceed the total expense (₹${totalAmt})`);
    }

    if (selectedSpotifyTrack) {
      payload.spotify_track = selectedSpotifyTrack;
    } else if (initialExpense?.spotify_track) {
      payload.spotify_track = null;
    }

    setLoading(true);
    try {
      const url = initialExpense ? `/api/expenses/${initialExpense.id}` : '/api/expenses';
      const method = initialExpense ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : (initialExpense ? 'Failed to update expense' : 'Failed to add expense'));
      const expenseId = initialExpense?.id ?? data.expenseId;

      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append('images', file));
        const uploadRes = await fetch(`/api/expenses/${expenseId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload images');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSpotifySearch = async () => {
    if (spotifyQuery.trim().length < 2) return setError('Enter at least 2 characters to search Spotify');
    setSearchingSpotify(true);
    setError('');
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(spotifyQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to search Spotify');
      setSpotifyResults(data.tracks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spotify search failed');
    } finally {
      setSearchingSpotify(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{initialExpense ? 'Modify shared cost' : 'Track a shared cost'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Description */}
          <div>
            <label className="form-label">Description *</label>
            <input className="form-input" placeholder="e.g. Dinner at Taj, Hotel booking..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Amount + Paid By */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Total Amount (₹) *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Paid By *</label>
              <select className="form-input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Type */}
          <div>
            <label className="form-label">Split Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {SPLIT_TYPES.map((st) => (
                <button
                  key={st.value}
                  onClick={() => setSplitType(st.value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `1px solid ${splitType === st.value ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: splitType === st.value ? 'rgba(124,111,255,0.12)' : 'var(--bg-elevated)',
                    color: splitType === st.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                  title={st.desc}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="form-label">Participants</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map((m) => {
                const isParticipant = participants.includes(m.id);
                const isExcluded = excludedUsers.includes(m.id);
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'var(--bg-elevated)',
                      border: `1px solid ${isParticipant && splitType !== 'exclude' ? 'var(--accent-primary)' : 'var(--border)'}`,
                      opacity: splitType !== 'equal' || isParticipant ? 1 : 0.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isParticipant}
                      onChange={() => toggleParticipant(m.id)}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</span>

                    {/* Exact amount input */}
                    {splitType === 'exact' && isParticipant && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>₹</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 90, padding: '6px 8px', fontSize: 13 }}
                          placeholder="0.00"
                          value={exactAmounts[m.id] ?? ''}
                          onChange={(e) => setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Percentage input */}
                    {splitType === 'percentage' && isParticipant && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 70, padding: '6px 8px', fontSize: 13 }}
                          placeholder="0"
                          value={percentages[m.id] ?? ''}
                          onChange={(e) => setPercentages({ ...percentages, [m.id]: e.target.value })}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>%</span>
                      </div>
                    )}

                    {/* Adjustment input */}
                    {splitType === 'adjustment' && isParticipant && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>+ ₹</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 80, padding: '6px 8px', fontSize: 13 }}
                          placeholder="Extra"
                          value={adjustments[m.id] ?? ''}
                          onChange={(e) => setAdjustments({ ...adjustments, [m.id]: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Exclude checkbox */}
                    {splitType === 'exclude' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--accent-danger)' }}>
                        <input
                          type="checkbox"
                          checked={isExcluded}
                          onChange={() =>
                            setExcludedUsers((prev) =>
                              prev.includes(m.id) ? prev.filter((u) => u !== m.id) : [...prev, m.id]
                            )
                          }
                          style={{ accentColor: 'var(--accent-danger)', cursor: 'pointer' }}
                        />
                        Exclude
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Validation totals */}
            {splitType === 'exact' && totalAmt > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: Math.abs(exactTotal - totalAmt) < 0.01 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                Total assigned: ₹{exactTotal.toFixed(2)} / ₹{totalAmt.toFixed(2)}
                {Math.abs(exactTotal - totalAmt) >= 0.01 && ` (diff: ₹${Math.abs(exactTotal - totalAmt).toFixed(2)})`}
              </div>
            )}
            {splitType === 'percentage' && (
              <div style={{ marginTop: 8, fontSize: 12, color: Math.abs(pctTotal - 100) < 0.01 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                Total: {pctTotal.toFixed(1)}% / 100%
              </div>
            )}
            {splitType === 'adjustment' && totalAmt > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: remainingForEqual >= 0 ? 'var(--text-secondary)' : 'var(--accent-danger)' }}>
                Total extra: ₹{adjTotal.toFixed(2)} | Remaining to split equally: ₹{remainingForEqual.toFixed(2)}
                {remainingForEqual < 0 && ' (Exceeds total!)'}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Fun Images</label>
            <input
              className="form-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, 4))}
            />
            {imageFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {imageFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="badge badge-purple" style={{ fontSize: 11 }}>
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Spotify Song</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Search a song"
                value={spotifyQuery}
                onChange={(e) => setSpotifyQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSpotifySearch()}
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" onClick={handleSpotifySearch} disabled={searchingSpotify} style={{ flexShrink: 0 }}>
                {searchingSpotify ? 'Searching...' : 'Search'}
              </button>
            </div>

            {selectedSpotifyTrack && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(34, 211, 160, 0.08)', border: '1px solid rgba(34, 211, 160, 0.25)' }}>
                {selectedSpotifyTrack.album_image_url && (
                  <div
                    aria-hidden="true"
                    style={{ width: 42, height: 42, borderRadius: 6, backgroundImage: `url(${selectedSpotifyTrack.album_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedSpotifyTrack.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedSpotifyTrack.artist}</div>
                </div>
                <button className="btn-secondary" onClick={() => setSelectedSpotifyTrack(null)} style={{ padding: '5px 9px', fontSize: 12 }}>Remove</button>
              </div>
            )}

            {spotifyResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, maxHeight: 180, overflow: 'auto' }}>
                {spotifyResults.map((track) => (
                  <button
                    key={track.spotify_track_id}
                    onClick={() => {
                      setSelectedSpotifyTrack(track);
                      setSpotifyResults([]);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 8,
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {track.album_image_url && (
                      <span
                        aria-hidden="true"
                        style={{ width: 36, height: 36, borderRadius: 6, backgroundImage: `url(${track.album_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }}
                      />
                    )}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{track.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{track.artist}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p style={{ color: 'var(--accent-danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
              {loading ? '⏳ Saving...' : (initialExpense ? 'Save Changes' : '+ Add Expense')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
