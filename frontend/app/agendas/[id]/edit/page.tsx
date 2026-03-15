'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { agendasApi, shareApi, type Agenda, type AgendaMember } from '@/lib/api';
import TopNav from '@/components/TopNav';

const INPUT =
  'w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:ring-offset-slate-950';
const LABEL = 'mb-1.5 block text-xs font-medium text-slate-400';

export default function EditAgendaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [members, setMembers] = useState<AgendaMember[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      setToken(session.access_token);
      setUserId(session.user.id);
      try {
        const [a, m] = await Promise.all([
          agendasApi.get(id, session.access_token),
          shareApi.members(id, session.access_token),
        ]);
        setAgenda(a);
        setMembers(m ?? []);
        setTitle(a.title);
        setDescription(a.description || '');
        setVisibility(a.visibility || 'private');
      } catch {
        setAgenda(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !agenda) return;
    setError('');
    setSaving(true);
    try {
      await agendasApi.update(id, { title, description: description || undefined, visibility }, token);
      router.push(`/agendas/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await agendasApi.delete(id, token);
      router.push('/dashboard');
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    if (!token) return;
    try {
      await shareApi.updateMember(id, memberId, { role }, token);
      setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch {
      /* ignore */
    }
  }

  const isOwner = agenda?.owner_id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <TopNav />
        <div className="mx-auto max-w-[480px] px-5 pt-10">
          <div className="mb-3 h-5 w-32 animate-pulse rounded bg-slate-800" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-slate-950">
        <TopNav />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-slate-400">Agenda not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav breadcrumb={agenda.title} />
      <div className="mx-auto max-w-[480px] px-5 py-8">
        <h1 className="mb-6 text-lg font-semibold tracking-tight text-slate-100">Edit agenda</h1>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className={LABEL}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Description <span className="text-slate-500">(optional)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Visibility</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={INPUT + ' cursor-pointer'}>
              <option value="private">Private</option>
              <option value="restricted">Restricted</option>
              <option value="public">Public</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors focus:ring-offset-slate-950"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/agendas/${id}`)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="my-8 h-px bg-slate-800" />
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Members</p>
        {(members ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No members yet. Share the agenda to add members.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
            {(members ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border-b border-slate-800 px-4 py-3 last:border-b-0"
              >
                <p className="text-sm font-medium text-slate-200">{m.name || m.email}</p>
                {isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:ring-offset-slate-950"
                  >
                    <option value="viewer">viewer</option>
                    <option value="commenter">commenter</option>
                    <option value="editor">editor</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                    {m.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <>
            <div className="my-8 h-px bg-slate-800" />
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Delete this agenda?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm font-medium text-red-400 hover:underline disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-red-400 hover:underline"
              >
                Delete agenda
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
