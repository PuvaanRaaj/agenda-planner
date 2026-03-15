'use client';

import { useState } from 'react';
import { shareApi } from '@/lib/api';

type Props = {
  agendaId: string;
  token: string;
  onClose: () => void;
};

export default function ShareModal({ agendaId, token, onClose }: Props) {
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('view');
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setError('');
    setLoading(true);
    try {
      const res = await shareApi.createToken(agendaId, { permission }, token);
      const url = typeof window !== 'undefined' ? `${window.location.origin}/share/${res.token}` : '';
      setGenerated(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!generated) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const INPUT = 'w-full rounded-md border border-[#222222] bg-[#111111] px-3 py-2 text-sm text-[#fafafa] focus:border-[#444] focus:outline-none cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#fafafa]">Share agenda</h2>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-[#444] hover:bg-[#161616] hover:text-[#fafafa] transition-colors">
            ×
          </button>
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block text-[11px] font-medium text-[#666]">Permission level</label>
          <select value={permission} onChange={(e) => setPermission(e.target.value as 'view' | 'comment' | 'edit')} className={INPUT}>
            <option value="view">View only</option>
            <option value="comment">Can comment</option>
            <option value="edit">Can edit</option>
          </select>
        </div>
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <button type="button" onClick={handleGenerate} disabled={loading}
          className="mb-3 w-full rounded-md bg-[#fafafa] py-2 text-sm font-semibold text-[#111] hover:bg-[#e5e5e5] disabled:opacity-40 transition-colors">
          {loading ? 'Generating…' : 'Generate link'}
        </button>
        {generated && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-2.5">
            <span className="truncate font-mono text-[11px] text-[#555]">{generated}</span>
            <button type="button" onClick={handleCopy}
              className="whitespace-nowrap text-xs text-[#888] underline hover:text-[#fafafa] transition-colors">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
