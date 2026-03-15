'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { authApi } from '@/lib/api';

const inputClass =
  'w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') ?? '';
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signError } = await supabase.auth.signUp({ email, password });
      if (signError) {
        setError(signError.message);
        return;
      }
      const session = data.session;
      if (session && data.user) {
        await authApi.sync(
          { id: data.user.id, email: data.user.email ?? '', name: data.user.user_metadata?.name },
          session.access_token
        );
        router.push(redirect);
        router.refresh();
      } else {
        setConfirmed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-[360px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="text-sm font-semibold text-slate-300">Agenda Planner</span>
        </Link>
        {confirmed ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5">
            <p className="mb-1 text-sm font-medium text-slate-100">Check your email</p>
            <p className="text-sm text-slate-400">We sent a confirmation link to {email}.</p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-100">Create account</h1>
            <p className="mb-6 text-sm text-slate-400">Get started for free</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-slate-400">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>
            <div className="my-6 h-px bg-slate-800" />
            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirect)}`}
                className="font-medium text-primary-400 hover:text-primary-300 underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
