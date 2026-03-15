'use client';

import { useState, useEffect } from 'react';
import type { Comment } from '@/lib/api';
import { commentsApi } from '@/lib/api';

type Props = {
  itemId: string;
  token?: string | null;
  shareToken?: string | null;
};

export default function CommentThread({ itemId, token, shareToken }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setLoading(true);
    commentsApi.list(itemId, token ?? undefined, shareToken ?? undefined)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [itemId, token, shareToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      const created = await commentsApi.create(itemId, { body: body.trim() }, token ?? undefined, shareToken ?? undefined);
      setComments((c) => [...c, created]);
      setBody('');
    } catch { /* ignore */ }
    finally { setPosting(false); }
  }

  async function handleDelete(commentId: string) {
    if (!token) return;
    try {
      await commentsApi.delete(commentId, token);
      setComments((c) => c.filter((x) => x.id !== commentId));
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="space-y-2 px-3 py-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#161616]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#161616]" />
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
        Comments{comments.length > 0 ? ` (${comments.length})` : ''}
      </p>
      {comments.length === 0 && (
        <p className="mb-3 text-xs text-[#444]">No comments yet.</p>
      )}
      <div className="mb-3 space-y-2.5">
        {comments.map((c) => (
          <div key={c.id}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] text-[#555]">
                {c.name || c.email || 'Anonymous'} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {token && c.user_id && (
                <button type="button" onClick={() => handleDelete(c.id)}
                  className="text-[10px] text-[#444] underline hover:text-red-400">
                  delete
                </button>
              )}
            </div>
            <p className="text-sm text-[#ddd]">{c.body}</p>
          </div>
        ))}
      </div>
      {(token || shareToken) && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none"
          />
          <button type="submit" disabled={posting || !body.trim()}
            className="rounded-md border border-[#2a2a2a] px-3 py-2 text-sm text-[#888] hover:border-[#444] hover:text-[#fafafa] disabled:opacity-40 transition-colors">
            Post
          </button>
        </form>
      )}
    </div>
  );
}
