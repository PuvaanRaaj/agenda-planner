'use client';

import { useState, useEffect } from 'react';
import type { Comment } from '@/lib/api';
import { commentsApi } from '@/lib/api';

type Props = {
  itemId: string;
  token?: string | null;
  shareToken?: string | null;
};

const inputClass =
  'flex-1 rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export default function CommentThread({ itemId, token, shareToken }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    commentsApi
      .list(itemId, token ?? undefined, shareToken ?? undefined)
      .then((c) => setComments(c ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [itemId, token, shareToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const created = await commentsApi.create(
        itemId,
        { body: body.trim() },
        token ?? undefined,
        shareToken ?? undefined
      );
      setComments((c) => [...c, created]);
      setBody('');
    } catch {
      /* ignore */
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!token) return;
    try {
      await commentsApi.delete(commentId, token);
      setComments((c) => c.filter((x) => x.id !== commentId));
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 px-4 py-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-700" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </p>
      {comments.length === 0 && <p className="mb-3 text-sm text-slate-500">No comments yet.</p>}
      <div className="mb-3 space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-slate-800/50 p-2.5">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {c.name || c.email || 'Anonymous'} ·{' '}
                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {token && c.user_id && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-slate-500 underline hover:text-red-400"
                >
                  delete
                </button>
              )}
            </div>
            <p className="text-sm text-slate-200">{c.body}</p>
          </div>
        ))}
      </div>
      {(token || shareToken) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600 disabled:opacity-50"
          >
            Post
          </button>
        </form>
      )}
    </div>
  );
}
