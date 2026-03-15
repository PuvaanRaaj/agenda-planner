'use client';

import { useState } from 'react';
import { shareApi } from '@/lib/api';

type Props = {
  agendaId: string;
  token: string;
  onClose: () => void;
};

const inputClass =
  'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Share agenda</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          >
            ×
          </button>
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Permission level</label>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as 'view' | 'comment' | 'edit')}
            className={inputClass}
          >
            <option value="view">View only</option>
            <option value="comment">Can comment</option>
            <option value="edit">Can edit</option>
          </select>
        </div>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mb-3 w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate link'}
        </button>
        {generated && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
            <span className="truncate font-mono text-xs text-slate-400">{generated}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-xs font-medium text-primary-400 hover:text-primary-300 underline"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
