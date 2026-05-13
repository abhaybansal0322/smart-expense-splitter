'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  DashboardActivity,
  DashboardAnalytics,
  DashboardChartDatum,
  DashboardGlobalSummary,
  DashboardNotification,
  DashboardUpcomingDue,
} from '@/lib/types';
import { formatIndianNumberCompact, formatRelativeTime } from '@/lib/formatCurrency';
import { DASHBOARD_UPDATE_TABS, DashboardUpdateTab, getDashboardUpdateTabCounts } from './dashboardUpdateTabs';

function EmptyPanel({ message }: { message: string }) {
  return (
    <div style={{ padding: '22px 18px', color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
      {message}
    </div>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h2>
      {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}

function BarList({ data, compact = false }: { data: DashboardChartDatum[]; compact?: boolean }) {
  const max = Math.max(...data.map((item) => item.amount), 1);

  if (data.length === 0) {
    return <EmptyPanel message="No expense data yet" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 9 : 12 }}>
      {data.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', flexShrink: 0 }}>
              {formatIndianNumberCompact(item.amount)}
            </span>
          </div>
          <div style={{ height: compact ? 6 : 8, borderRadius: 999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(6, (item.amount / max) * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background: 'var(--gradient-primary)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendBars({ data }: { data: DashboardChartDatum[] }) {
  const max = Math.max(...data.map((item) => item.amount), 1);

  if (data.length === 0) {
    return <EmptyPanel message="No timeline data yet" />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, minmax(28px, 1fr))`, gap: 8, alignItems: 'end', minHeight: 170 }}>
      {data.map((item) => (
        <div key={item.label} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, minHeight: 170 }}>
          <div
            title={`${item.label}: ${formatIndianNumberCompact(item.amount)}`}
            style={{
              minHeight: 8,
              height: `${Math.max(8, (item.amount / max) * 130)}px`,
              borderRadius: '8px 8px 3px 3px',
              background: 'linear-gradient(180deg, var(--accent-success), var(--accent-secondary))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function GlobalSummaryPanel({ summary }: { summary: DashboardGlobalSummary | null }) {
  if (!summary) return null;

  const cards = [
    {
      label: 'You owe',
      value: formatIndianNumberCompact(summary.totalYouOwe),
      tone: summary.totalYouOwe > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
      helper: 'Across all groups',
    },
    {
      label: 'Owed to you',
      value: formatIndianNumberCompact(summary.totalOwedToYou),
      tone: 'var(--accent-success)',
      helper: 'Expected incoming',
    },
    {
      label: 'Confirmations',
      value: summary.pendingConfirmations,
      tone: summary.pendingConfirmations > 0 ? 'var(--accent-warning)' : 'var(--accent-success)',
      helper: `${summary.pendingToConfirm} to review, ${summary.pendingAwaitingOthers} waiting`,
    },
    {
      label: 'Biggest group',
      value: summary.biggestActiveGroup ? formatIndianNumberCompact(summary.biggestActiveGroup.totalExpenses) : 'None',
      tone: 'var(--accent-primary)',
      helper: summary.biggestActiveGroup?.name ?? 'No active spend yet',
    },
  ];

  return (
    <section style={{ marginBottom: 32 }} className="animate-fade-in">
      <PanelHeader title="Global Summary" subtitle="Your money position across every active group." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {cards.map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: card.tone, marginTop: 6 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{card.helper}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: DashboardAnalytics | null }) {
  if (!analytics) return null;

  return (
    <section style={{ marginBottom: 32 }} className="animate-fade-in">
      <PanelHeader title="Analytics" subtitle="Spending patterns by category, payer, date, member, and month." />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: 16, marginBottom: 16 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Daily spend</h3>
          <TrendBars data={analytics.byDate} />
        </div>
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Monthly spend</h3>
          <BarList data={analytics.byMonth} compact />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>By category</h3>
          <BarList data={analytics.byCategory} />
        </div>
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>By payer</h3>
          <BarList data={analytics.byPayer} />
        </div>
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>By member share</h3>
          <BarList data={analytics.byMember} />
        </div>
      </div>
    </section>
  );
}

export function UpcomingDuesPanel({ dues }: { dues: DashboardUpcomingDue[] }) {
  const [reminders, setReminders] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = window.localStorage.getItem('splitkaro-dashboard-reminders');
    return stored ? JSON.parse(stored) : {};
  });

  const saveReminder = (dueId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const next = { ...reminders, [dueId]: tomorrow.toISOString() };
    setReminders(next);
    window.localStorage.setItem('splitkaro-dashboard-reminders', JSON.stringify(next));
  };

  return (
    <section className="glass-card" style={{ padding: 20 }}>
      <PanelHeader title="Upcoming Dues" subtitle="Pending settlements and lightweight reminders." />
      {dues.length === 0 ? (
        <EmptyPanel message="No pending dues or reminders" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dues.map((due) => {
            const reminder = reminders[due.id];
            return (
              <div key={due.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {due.direction === 'incoming' ? `${due.personName} owes you` : `You owe ${due.personName}`}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                      {due.group_name} · pending for {due.daysPending} day{due.daysPending === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ color: due.direction === 'incoming' ? 'var(--accent-success)' : 'var(--accent-warning)', fontWeight: 900 }}>
                    {formatIndianNumberCompact(due.amount)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {reminder ? `Reminder set for ${new Date(reminder).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No reminder set'}
                  </span>
                  <button className="btn-secondary" onClick={() => saveReminder(due.id)} style={{ padding: '6px 10px', fontSize: 12 }}>
                    Remind tomorrow
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function NotificationsCenter({ notifications }: { notifications: DashboardNotification[] }) {
  return (
    <section className="glass-card" style={{ padding: 20 }}>
      <PanelHeader title="Notifications" subtitle="Invites, expenses, settlements, and member activity." />
      {notifications.length === 0 ? (
        <EmptyPanel message="No notifications yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.group_id ? `/groups/${notification.group_id}` : '/dashboard'}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{notification.title}</div>
                  <span className="badge badge-purple" style={{ fontSize: 10 }}>{notification.kind}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{notification.detail}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>{formatRelativeTime(notification.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function activityText(activity: DashboardActivity) {
  const amount = Number(activity.metadata.amount ?? 0);
  const description = String(activity.metadata.description ?? 'expense');

  switch (activity.action) {
    case 'EXPENSE_CREATED':
      return `${activity.user.name} added ${description}${amount > 0 ? ` for ${formatIndianNumberCompact(amount)}` : ''}`;
    case 'EXPENSE_UPDATED':
      return `${activity.user.name} updated an expense`;
    case 'EXPENSE_DELETED':
      return `${activity.user.name} deleted ${description}`;
    case 'SETTLEMENT_CREATED':
      return `${activity.user.name} recorded a settlement${amount > 0 ? ` for ${formatIndianNumberCompact(amount)}` : ''}`;
    case 'SETTLEMENT_CONFIRMED':
      return `${activity.user.name} confirmed a settlement${amount > 0 ? ` for ${formatIndianNumberCompact(amount)}` : ''}`;
    case 'MEMBER_JOINED':
      return `${activity.user.name} joined the group`;
    case 'GROUP_CREATED':
      return `${activity.user.name} created the group`;
    default:
      return `${activity.user.name} performed an action`;
  }
}

export function RecentActivityFeed({ activity }: { activity: DashboardActivity[] }) {
  const latest = useMemo(() => activity.slice(0, 8), [activity]);

  return (
    <section className="glass-card" style={{ padding: 20 }}>
      <PanelHeader title="Recent Activity" subtitle="Latest movement across all your groups." />
      {latest.length === 0 ? (
        <EmptyPanel message="No recent activity yet" />
      ) : (
        <div style={{ position: 'relative', paddingLeft: 18 }}>
          <div style={{ position: 'absolute', left: 5, top: 4, bottom: 4, width: 2, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {latest.map((item) => (
              <Link key={item.id} href={`/groups/${item.group_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: -17, top: 5, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)', border: '2px solid var(--bg-card)' }} />
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{item.group_name}</span>
                    {' · '}
                    {activityText(item)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{formatRelativeTime(item.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function DashboardUpdatesTabs({
  upcomingDues,
  notifications,
  recentActivity,
}: {
  upcomingDues: DashboardUpcomingDue[];
  notifications: DashboardNotification[];
  recentActivity: DashboardActivity[];
}) {
  const [activeTab, setActiveTab] = useState<DashboardUpdateTab>('dues');
  const counts = getDashboardUpdateTabCounts({ upcomingDues, notifications, recentActivity });

  return (
    <section style={{ marginBottom: 32 }} className="animate-fade-in">
      <PanelHeader title="Updates" subtitle="Switch between dues, notifications, and recent activity." />
      <div
        role="tablist"
        aria-label="Dashboard updates"
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
          marginBottom: 16,
        }}
      >
        {DASHBOARD_UPDATE_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: `2px solid ${selected ? 'var(--accent-primary)' : 'transparent'}`,
                background: 'none',
                color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: selected ? 700 : 500,
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {tab.label}
              <span
                style={{
                  minWidth: 24,
                  borderRadius: 999,
                  padding: '1px 8px',
                  background: selected ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: selected ? 'white' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === 'dues' && <UpcomingDuesPanel dues={upcomingDues} />}
        {activeTab === 'notifications' && <NotificationsCenter notifications={notifications} />}
        {activeTab === 'activity' && <RecentActivityFeed activity={recentActivity} />}
      </div>
    </section>
  );
}
