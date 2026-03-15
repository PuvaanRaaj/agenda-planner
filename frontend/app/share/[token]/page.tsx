'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { shareApi, type Agenda } from '@/lib/api';
import WeekStrip from '@/components/WeekStrip';
import CommentThread from '@/components/CommentThread';

function formatTime(t: string) {
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`;
}

const PERMISSION_LABEL: Record<string, string> = {
  view: 'View-only link',
  comment: 'Comment link',
  edit: 'Edit link',
};

export default function ShareViewPage() {
  const params = useParams();
  const router = useRouter();
  const shareToken = params.token as string;

  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [permission, setPermission] = useState<string>('view');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { permission: perm, agenda: a } = await shareApi.byToken(shareToken);
        setPermission(perm);

        if (perm === 'view') {
          setAgenda(a);
          setLoading(false);
          return;
        }

        // comment / edit: require the user to be signed in
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setNeedsAuth(true);
          setLoading(false);
          return;
        }
        setAuthToken(session.access_token);
        setAgenda(a);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid or expired link');
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  // Auto-jump to earliest item date when today has no items
  const items = useMemo(() => agenda?.items ?? [], [agenda]);
  const itemDates = useMemo(() => new Set(items.map((i) => i.date)), [items]);
  useEffect(() => {
    if (items.length === 0) return;
    setSelectedDate((cur) => {
      if (items.some((i) => i.date === cur)) return cur;
      return [...items].sort((a, b) => a.date.localeCompare(b.date))[0].date;
    });
  }, [items]);

  const dayItems = useMemo(
    () => items.filter((i) => i.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [items, selectedDate]
  );

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const nav = (
    <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500">
          <span className="text-xs font-bold text-white">A</span>
        </div>
        <span className="text-sm text-slate-500">Agenda</span>
        {agenda && (
          <>
            <span className="text-slate-600">/</span>
            <span className="max-w-[200px] truncate text-sm font-medium text-slate-300">{agenda.title}</span>
          </>
        )}
      </div>
      <span className="text-xs font-medium text-slate-500">{PERMISSION_LABEL[permission] ?? 'Shared link'}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        {nav}
        <div className="flex h-12 gap-1 border-b border-slate-800 bg-slate-900/50 px-4 py-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-full flex-1 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
        <div className="space-y-2 px-4 py-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950">
        <p className="text-sm text-slate-400">{error}</p>
        <a href="/" className="text-sm font-medium text-primary-400 hover:text-primary-300 underline">
          Go home
        </a>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-slate-950">
        {nav}
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <p className="mb-1.5 text-base font-semibold text-slate-100">Sign in to access this link</p>
            <p className="text-sm text-slate-400">
              This shared agenda requires you to be signed in
              {permission === 'edit' ? ' to view and edit.' : ' to view and comment.'}
            </p>
          </div>
          <div className="flex w-full max-w-[240px] flex-col gap-2">
            <a
              href={`/login?redirect=/share/${shareToken}`}
              className="rounded-lg bg-primary-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              Sign in
            </a>
            <a
              href={`/signup?redirect=/share/${shareToken}`}
              className="rounded-lg border border-slate-600 px-4 py-2.5 text-center text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Create account
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950">
        <p className="text-sm text-slate-400">This link is invalid or has expired.</p>
        <a href="/" className="text-sm font-medium text-primary-400 hover:text-primary-300 underline">
          Go home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {nav}

      <WeekStrip selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setExpandedId(null); }} itemDates={itemDates} />

      <div className="px-4 pt-3 pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{selectedDateLabel}</p>
      </div>

      <div className="relative px-4 py-2">
        <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-slate-800" style={{ left: '60px' }} />

        {dayItems.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No items for this day.</p>
        )}

        {dayItems.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className="mb-1.5 flex gap-2.5">
              <span className="min-w-[28px] pt-2.5 text-[10px] tabular-nums text-slate-500">
                {formatTime(item.start_time)}
              </span>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={`w-full rounded-t-lg border px-3 py-2 text-left transition-colors ${
                    isExpanded
                      ? 'border-slate-700 border-b-0 bg-slate-900/50'
                      : 'rounded-b-lg border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <p className={`text-sm font-medium ${isExpanded ? 'font-semibold text-slate-100' : 'text-slate-200'}`}>{item.title}</p>
                  {(item.end_time || item.location) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.end_time ? `${formatTime(item.start_time)} – ${formatTime(item.end_time)}` : ''}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                  )}
                </button>
                {isExpanded && (
                  <div className="rounded-b-lg border border-t-0 border-slate-700 bg-slate-900/50 overflow-hidden">
                    <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-500">
                          {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                        {item.description && <p className="mt-1 text-xs text-slate-400">{item.description}</p>}
                      </div>
                      <button type="button" onClick={() => setExpandedId(null)} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
                        ×
                      </button>
                    </div>
                    <CommentThread itemId={item.id} token={authToken} shareToken={permission === 'view' ? shareToken : null} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
