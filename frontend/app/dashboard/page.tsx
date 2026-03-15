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
      if (!session?.access_token) { router.push('/login'); return; }
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
    <div className="min-h-screen bg-[#111111]">
      <TopNav userInitial={userInitial} />
      <div className="mx-auto max-w-[768px]">
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#fafafa]">My Agendas</h1>
            {!loading && (
              <p className="mt-0.5 text-xs text-[#555]">
                {agendas.length} agenda{agendas.length !== 1 ? 's' : ''}
                {sharedCount > 0 ? ` · ${sharedCount} shared with you` : ''}
              </p>
            )}
          </div>
          <Link
            href="/agendas/new"
            className="rounded-md bg-[#fafafa] px-3.5 py-1.5 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5]"
          >
            + New agenda
          </Link>
        </div>

        {loading ? (
          <div className="mx-5 mb-5 overflow-hidden rounded-lg border border-[#1f1f1f]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-3 last:border-b-0">
                <div>
                  <div className="mb-2 h-3.5 w-40 animate-pulse rounded bg-[#161616]" />
                  <div className="h-2.5 w-28 animate-pulse rounded bg-[#161616]" />
                </div>
                <div className="h-5 w-14 animate-pulse rounded-full bg-[#161616]" />
              </div>
            ))}
          </div>
        ) : agendas.length === 0 ? (
          <div className="mx-5 mb-5 rounded-lg border border-dashed border-[#2a2a2a] p-10 text-center">
            <p className="mb-3 text-sm text-[#555]">No agendas yet.</p>
            <Link href="/agendas/new" className="text-sm text-[#888] underline hover:text-[#fafafa]">
              Create your first agenda
            </Link>
          </div>
        ) : (
          <div className="mx-5 mb-5 overflow-hidden rounded-lg border border-[#1f1f1f]">
            {agendas.map((a) => (
              <Link
                key={a.id}
                href={`/agendas/${a.id}`}
                className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-3 last:border-b-0 transition-colors hover:bg-[#161616]"
              >
                <div>
                  <p className="text-sm font-medium text-[#fafafa]">{a.title}</p>
                  <p className="mt-0.5 text-xs text-[#555]">
                    {a.item_count ?? 0} item{(a.item_count ?? 0) !== 1 ? 's' : ''} · Updated {relativeTime(a.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.role && (
                    <span className="rounded-full border border-[#2a2a2a] px-2 py-0.5 text-[10px] font-medium text-[#666]">
                      {a.role}
                    </span>
                  )}
                  <span className="text-sm text-[#333]">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
