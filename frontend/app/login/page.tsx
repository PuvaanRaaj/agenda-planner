'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });
      if (signError) { setError(signError.message); return; }
      const token = data.session?.access_token;
      if (token && data.user) {
        await authApi.sync({ id: data.user.id, email: data.user.email ?? '', name: data.user.user_metadata?.name }, token);
      }
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#fafafa]">Sign in</h1>
        <p className="mb-6 text-sm text-[#555]">Welcome back</p>
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
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="mt-1 w-full rounded-md bg-[#fafafa] py-2 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5] disabled:opacity-40"
          >
            {loading ? 'Continuing…' : 'Continue'}
          </button>
        </form>
        <div className="my-5 h-px bg-[#1a1a1a]" />
        <p className="text-center text-xs text-[#555]">
          No account?{' '}
          <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-[#888] underline hover:text-[#fafafa]">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
