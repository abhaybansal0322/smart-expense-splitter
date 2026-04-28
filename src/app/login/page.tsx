'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 60px)', padding: '24px' }}>
      <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Welcome Back</h1>
        
        {error && (
          <div style={{ background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.3)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label" htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="form-input" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '8px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0' }} />

        <button 
          onClick={handleGoogleSignIn} 
          className="btn-secondary" 
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Sign in with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link href="/signup" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
