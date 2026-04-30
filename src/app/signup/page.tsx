'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 60px)', padding: '24px' }}>
      <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Create an Account</h1>
        
        {error && (
          <div style={{ background: 'rgba(248, 113, 113, 0.15)', border: '1px solid rgba(248, 113, 113, 0.3)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label" htmlFor="name">Name</label>
            <input 
              id="name"
              type="text" 
              className="form-input" 
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '8px' }}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0' }} />

        <button
          onClick={handleGoogleSignUp}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', opacity: 1 }}
        >
          Sign up with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
