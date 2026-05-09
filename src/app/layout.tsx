import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'splitkaro',
  description: 'Split expenses with friends, track group balances, and settle shared bills cleanly.',
  keywords: ['splitkaro', 'expense splitter', 'split bills', 'group expenses'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
