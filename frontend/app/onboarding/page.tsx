'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { agendasApi, itemsApi, shareApi } from '@/lib/api';

const INPUT = 'w-full rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none';
const LABEL = 'mb-1.5 block text-[11px] font-medium text-[#666]';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [token, setToken] = useState<string | null>(null);
  const [agendaId, setAgendaId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDesc, setAgendaDesc] = useState('');

  // Step 2 fields
  const [itemTitle, setItemTitle] = useState('');
  const [itemDate, setItemDate] = useState(today());
  const [itemTime, setItemTime] = useState('09:00');

  useEffect(() => {
    if (localStorage.getItem('onboarding_complete') === 'true') {
      router.replace('/dashboard');
      return;
    }
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.replace('/login'); return; }
      setToken(session.access_token);
    })();
  }, [router]);

  function finish() {
    localStorage.setItem('onboarding_complete', 'true');
    router.push('/dashboard');
  }

  async function handleCreateAgenda(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !agendaTitle.trim()) return;
    setError('');
    setLoading(true);
    try {
      const agenda = await agendasApi.create({ title: agendaTitle.trim(), description: agendaDesc.trim() || undefined }, token);
      setAgendaId(agenda.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agenda');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !agendaId || !itemTitle.trim()) return;
    setError('');
    setLoading(true);
    try {
      await itemsApi.create(agendaId, { title: itemTitle.trim(), date: itemDate, start_time: itemTime }, token);
      try {
        const { token: shareToken } = await shareApi.createToken(agendaId, { permission: 'view' }, token);
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setShareUrl(`${base}/share/${shareToken}`);
      } catch {
        setShareUrl('');
      }
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  }

  function copyUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const stepLabels = ['Create agenda', 'Add an item', 'Share it'];

  return (
    <div className="flex min-h-screen flex-col bg-[#111111]">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fafafa]">
            <span className="text-xs font-bold text-[#111]">A</span>
          </div>
          <span className="text-sm font-semibold text-[#fafafa]">Agenda Planner</span>
        </div>
        <button type="button" onClick={finish} className="text-xs text-[#444] hover:text-[#fafafa]">
          Skip →
        </button>
      </div>

      <div className="flex justify-center gap-2 px-6 pt-8">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
              step === i + 1
                ? 'bg-[#fafafa] text-[#111]'
                : step > i + 1
                ? 'bg-[#2a2a2a] text-[#555]'
                : 'border border-[#2a2a2a] text-[#444]'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${step === i + 1 ? 'text-[#fafafa]' : 'text-[#444]'}`}>{label}</span>
            {i < stepLabels.length - 1 && <span className="text-[#2a2a2a]">—</span>}
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[440px] px-6 py-10">
        {step === 1 && (
          <form onSubmit={handleCreateAgenda} className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-semibold text-[#fafafa]">Create your first agenda</h1>
              <p className="mt-1 text-sm text-[#555]">Give your agenda a name to get started.</p>
            </div>
            <div>
              <label className={LABEL}>Title</label>
              <input required value={agendaTitle} onChange={(e) => setAgendaTitle(e.target.value)}
                className={INPUT} placeholder="e.g. Team offsite, Weekly standup" autoFocus />
            </div>
            <div>
              <label className={LABEL}>Description <span className="text-[#444]">(optional)</span></label>
              <textarea rows={2} value={agendaDesc} onChange={(e) => setAgendaDesc(e.target.value)}
                className={INPUT} placeholder="What is this agenda for?" />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading || !agendaTitle.trim()}
              className="rounded-md bg-[#fafafa] py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5] disabled:opacity-40">
              {loading ? 'Creating…' : 'Create agenda →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleAddItem} className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-semibold text-[#fafafa]">Add your first item</h1>
              <p className="mt-1 text-sm text-[#555]">Schedule something on your agenda.</p>
            </div>
            <div>
              <label className={LABEL}>Title</label>
              <input required value={itemTitle} onChange={(e) => setItemTitle(e.target.value)}
                className={INPUT} placeholder="e.g. Opening remarks, Lunch break" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Date</label>
                <input type="date" required value={itemDate} onChange={(e) => setItemDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Start time</label>
                <input type="time" required value={itemTime} onChange={(e) => setItemTime(e.target.value)} className={INPUT} />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading || !itemTitle.trim()}
              className="rounded-md bg-[#fafafa] py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5] disabled:opacity-40">
              {loading ? 'Adding…' : 'Add item →'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-semibold text-[#fafafa]">Share your agenda</h1>
              <p className="mt-1 text-sm text-[#555]">Send this link to anyone — no account needed to view.</p>
            </div>
            {shareUrl ? (
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className={INPUT + ' flex-1'}
                  onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button type="button" onClick={copyUrl}
                  className="rounded-md border border-[#2a2a2a] px-3 py-2 text-xs font-medium text-[#888] transition-colors hover:border-[#444] hover:text-[#fafafa]">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-[#555]">Could not generate share link.</p>
            )}
            <button type="button" onClick={finish}
              className="rounded-md bg-[#fafafa] py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-[#e5e5e5]">
              Go to my dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
