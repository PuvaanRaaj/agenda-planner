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
    <div className="flex h-11 items-center justify-between border-b border-[#1a1a1a] bg-[#0d0d0d] px-5">
      <div className="flex items-center gap-2">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[4px] bg-[#fafafa]">
          <span className="text-[11px] font-bold text-[#111]">A</span>
        </div>
        <span className="text-[#444] text-sm">Agenda</span>
        {agenda && (
          <>
            <span className="text-[#333]">/</span>
            <span className="text-sm font-medium text-[#fafafa] truncate max-w-[200px]">{agenda.title}</span>
          </>
        )}
      </div>
      <span className="text-xs text-[#555]">{PERMISSION_LABEL[permission] ?? 'Shared link'}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111]">
        {nav}
        <div className="flex h-11 gap-1 border-b border-[#1a1a1a] px-4 py-2">
          {Array.from({ length: 7 }, (_, i) => <div key={i} className="h-full flex-1 animate-pulse rounded bg-[#161616]" />)}
        </div>
        <div className="space-y-2 px-4 py-4">
          {[0, 1].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-[#161616]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#111111]">
        <p className="text-sm text-[#555]">{error}</p>
        <a href="/" className="text-sm text-[#555] underline hover:text-[#fafafa]">Go home</a>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#111111]">
        {nav}
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#161616]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#888]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <p className="mb-1.5 text-base font-semibold text-[#fafafa]">Sign in to access this link</p>
            <p className="text-sm text-[#555]">
              This shared agenda requires you to be signed in
              {permission === 'edit' ? ' to view and edit.' : ' to view and comment.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <a
              href={`/login?redirect=/share/${shareToken}`}
              className="rounded-md bg-[#fafafa] px-4 py-2.5 text-sm font-semibold text-[#111] text-center hover:bg-[#e5e5e5] transition-colors"
            >
              Sign in
            </a>
            <a
              href={`/signup?redirect=/share/${shareToken}`}
              className="rounded-md border border-[#2a2a2a] px-4 py-2.5 text-sm text-[#888] text-center hover:border-[#444] hover:text-[#fafafa] transition-colors"
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#111111]">
        <p className="text-sm text-[#555]">This link is invalid or has expired.</p>
        <a href="/" className="text-sm text-[#555] underline hover:text-[#fafafa]">Go home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111]">
      {nav}

      <WeekStrip selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setExpandedId(null); }} itemDates={itemDates} />

      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#555]">{selectedDateLabel}</p>
      </div>

      <div className="relative px-4 py-2">
        <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#1f1f1f]" style={{ left: '60px' }} />

        {dayItems.length === 0 && (
          <p className="py-8 text-center text-sm text-[#444]">No items for this day.</p>
        )}

        {dayItems.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} className="mb-1.5 flex gap-2.5">
              <span className="min-w-[28px] pt-2.5 text-[10px] tabular-nums text-[#444]">
                {formatTime(item.start_time)}
              </span>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    isExpanded
                      ? 'rounded-t-md border border-[#fafafa] bg-[#fafafa]'
                      : 'rounded-md border border-[#222222] bg-[#161616] hover:border-[#2a2a2a] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <p className={`text-sm font-medium ${isExpanded ? 'font-semibold text-[#111]' : 'text-[#ddd]'}`}>{item.title}</p>
                  {(item.end_time || item.location) && (
                    <p className={`mt-0.5 text-[11px] ${isExpanded ? 'text-[#666]' : 'text-[#555]'}`}>
                      {item.end_time ? `${formatTime(item.start_time)} – ${formatTime(item.end_time)}` : ''}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                  )}
                </button>
                {isExpanded && (
                  <div className="rounded-b-md border border-t-0 border-[#222222] bg-[#0d0d0d] overflow-hidden">
                    <div className="flex items-start justify-between border-b border-[#1f1f1f] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-[#fafafa]">{item.title}</p>
                        <p className="text-[11px] text-[#555]">
                          {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                        {item.description && <p className="mt-1 text-xs text-[#666]">{item.description}</p>}
                      </div>
                      <button type="button" onClick={() => setExpandedId(null)}
                        className="text-base leading-none text-[#444] hover:text-[#fafafa]">×</button>
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
