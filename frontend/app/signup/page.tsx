'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { authApi } from '@/lib/api';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signError } = await supabase.auth.signUp({ email, password });
      if (signError) { setError(signError.message); return; }
      const session = data.session;
      if (session && data.user) {
        await authApi.sync({ id: data.user.id, email: data.user.email ?? '', name: data.user.user_metadata?.name }, session.access_token);
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
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-6">
      <div className="w-full max-w-[340px]">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] bg-[#fafafa]">
            <span className="text-[11px] font-bold text-[#111]">A</span>
          </div>
          <span className="text-sm font-semibold text-[#fafafa]">Agenda</span>
        </div>
        {confirmed ? (
          <div>
            <p className="mb-1 text-sm font-medium text-[#fafafa]">Check your email</p>
            <p className="text-xs text-[#555]">We sent a confirmation link to {email}.</p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#fafafa]">Create account</h1>
            <p className="mb-6 text-sm text-[#555]">Get started for free</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[11px] font-medium text-[#666]">Email</label>
                <input
                  id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-[11px] font-medium text-[#666]">Password</label>
                <input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-[11px] font-medium text-[#666]">Confirm password</label>
                <input
                  id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit" disabled={loading}
                className="mt-1 w-full rounded-md bg-[#fafafa] py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5] disabled:opacity-40"
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>
            <div className="my-5 h-px bg-[#1a1a1a]" />
            <p className="text-center text-xs text-[#555]">
              Already have an account?{' '}
              <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-[#888] underline hover:text-[#fafafa]">Sign in</Link>
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
