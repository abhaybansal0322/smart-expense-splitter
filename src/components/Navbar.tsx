'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { SplitkaroLogo } from '@/components/SplitkaroLogo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/groups', label: 'Groups', icon: 'groups' },
];

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'groups') {
    return (
      <span className="nav-icon" aria-hidden="true">
        <span />
        <span />
      </span>
    );
  }

  return (
    <span className="nav-icon nav-icon-grid" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}
      >
        <SplitkaroLogo href="/" size="sm" />

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: active ? 'rgba(124, 111, 255, 0.1)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </Link>
            );
          })}

          <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {session.user?.name?.split(' ')[0]}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }}>
                Login
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
