'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { agendasApi } from '@/lib/api';

const INPUT =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';
const LABEL = 'mb-1.5 block text-xs font-medium text-slate-700';

export default function NewAgendaPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      const agenda = await agendasApi.create(
        { title, description: description || undefined, visibility },
        session.access_token
      );
      router.push(`/agendas/${agenda.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-[480px]">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-slate-900">New agenda</h1>
        <p className="mb-6 text-sm text-slate-600">Give your agenda a name to get started.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="title" className={LABEL}>Title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={INPUT}
              placeholder="e.g. Team Sprint – Week 12"
            />
          </div>
          <div>
            <label htmlFor="description" className={LABEL}>
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={INPUT}
              placeholder="What is this agenda for?"
            />
          </div>
          <div>
            <label htmlFor="visibility" className={LABEL}>Visibility</label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className={INPUT + ' cursor-pointer'}
            >
              <option value="private">Private</option>
              <option value="restricted">Restricted</option>
              <option value="public">Public</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating…' : 'Create agenda'}
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
