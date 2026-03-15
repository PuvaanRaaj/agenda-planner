'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { agendasApi, type Agenda } from '@/lib/api';
import TopNav from '@/components/TopNav';

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInitial, setUserInitial] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      setUserInitial((session.user.email?.[0] ?? '?').toUpperCase());
      try {
        const list = await agendasApi.list(session.access_token);
        setAgendas(list);
      } catch {
        setAgendas([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const sharedCount = agendas.filter((a) => a.role && a.role !== 'owner').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav userInitial={userInitial} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">My Agendas</h1>
            {!loading && (
              <p className="mt-1 text-sm text-slate-500">
                {agendas.length} agenda{agendas.length !== 1 ? 's' : ''}
                {sharedCount > 0 ? ` · ${sharedCount} shared with you` : ''}
              </p>
            )}
          </div>
          <Link
            href="/agendas/new"
            className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            + New agenda
          </Link>
        </div>

        {loading ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : agendas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="mb-3 text-sm text-slate-600">No agendas yet.</p>
            <Link
              href="/agendas/new"
              className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Create your first agenda
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {agendas.map((a) => (
              <Link
                key={a.id}
                href={`/agendas/${a.id}`}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {a.item_count ?? 0} item{(a.item_count ?? 0) !== 1 ? 's' : ''} · Updated{' '}
                    {relativeTime(a.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.role && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {a.role}
                    </span>
                  )}
                  <span className="text-slate-400">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
