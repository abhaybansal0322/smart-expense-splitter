import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Smart Expense Splitter',
  description: 'Split expenses effortlessly with friends. Track balances, settle debts with UPI, and never argue about money again.',
  keywords: ['expense splitter', 'split bills', 'UPI payment', 'group expenses'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
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
