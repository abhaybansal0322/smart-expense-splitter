// ─────────────── Shared UI: StatPill ───────────────
// A small pill-shaped stat display for headers and summaries.

export function StatPill({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
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
