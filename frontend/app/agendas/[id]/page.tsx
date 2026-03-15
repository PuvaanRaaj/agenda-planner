'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { agendasApi, itemsApi, type Agenda, type AgendaItem } from '@/lib/api';
import TopNav from '@/components/TopNav';
import WeekStrip from '@/components/WeekStrip';
import CommentThread from '@/components/CommentThread';
import ShareModal from '@/components/ShareModal';

const INPUT =
  'w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:ring-offset-slate-950';
const LABEL = 'mb-1 block text-xs font-medium text-slate-400';

function formatTime(t: string) {
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

type EditValues = {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
};

export default function AgendaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', date: selectedDate, start_time: '09:00', end_time: '', location: '', description: '' });

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push('/login'); return; }
      setToken(session.access_token);
      setUserEmail(session.user.email ?? '');
      try {
        const a = await agendasApi.get(id, session.access_token);
        setAgenda(a);
      } catch {
        setAgenda(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const items = useMemo(() => agenda?.items ?? [], [agenda]);

  const itemDates = useMemo(() => new Set(items.map((i) => i.date)), [items]);

  // Jump to the earliest item date if today has no items
  useEffect(() => {
    if (items.length === 0) return;
    setSelectedDate((cur) => {
      if (items.some((i) => i.date === cur)) return cur;
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      return sorted[0].date;
    });
  }, [items]);

  const dayItems = useMemo(
    () => items.filter((i) => i.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [items, selectedDate]
  );

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setExpandedId(null);
    setEditingId(null);
    setShowAddItem(false);
    setNewItem((n) => ({ ...n, date }));
  }

  function handleItemClick(item: AgendaItem) {
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(item.id);
      setEditingId(null);
    }
  }

  function startEdit(item: AgendaItem) {
    setEditingId(item.id);
    setEditValues({
      title: item.title,
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time ?? '',
      location: item.location ?? '',
      description: item.description ?? '',
    });
  }

  async function handleSaveEdit(item: AgendaItem) {
    if (!token || !editValues) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await itemsApi.update(id, item.id, {
        title: editValues.title,
        date: editValues.date,
        start_time: editValues.start_time,
        end_time: editValues.end_time || undefined,
        location: editValues.location || undefined,
        description: editValues.description || undefined,
      }, token);
      setAgenda((a) => a ? { ...a, items: (a.items ?? []).map((i) => i.id === item.id ? updated : i) } : null);
      setEditingId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally { setSaving(false); }
  }

  async function handleDeleteItem(itemId: string) {
    if (!token) return;
    try {
      await itemsApi.delete(id, itemId, token);
      setAgenda((a) => a ? { ...a, items: (a.items ?? []).filter((i) => i.id !== itemId) } : null);
      setExpandedId(null);
    } catch { /* ignore */ }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !agenda || !newItem.title || !newItem.date || !newItem.start_time) return;
    setSaveError('');
    try {
      const item = await itemsApi.create(agenda.id, {
        title: newItem.title,
        date: newItem.date,
        start_time: newItem.start_time,
        end_time: newItem.end_time || undefined,
        location: newItem.location || undefined,
        description: newItem.description || undefined,
      }, token);
      setAgenda((a) => a ? { ...a, items: [...(a.items ?? []), item] } : null);
      setNewItem({ title: '', date: selectedDate, start_time: '09:00', end_time: '', location: '', description: '' });
      setShowAddItem(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to add item');
    }
  }

  // owner and editors can add/edit/delete items
  const canEdit = token && (agenda?.role === 'owner' || agenda?.role === 'editor');

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <TopNav />
        <div className="flex gap-1 border-b border-slate-800 bg-slate-900/50 px-4 py-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-12 flex-1 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
        <div className="space-y-2 px-4 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-slate-950">
        <TopNav />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <p className="text-sm text-slate-400">Agenda not found.</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium text-primary-400 hover:text-primary-300 underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const navRight = (
    <>
      <button
        type="button"
        onClick={() => setShowShare(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        Share
      </button>
      <button
        type="button"
        onClick={() => router.push(`/agendas/${id}/edit`)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        Edit
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav breadcrumb={agenda.title} right={navRight} userInitial={(userEmail[0] ?? '?').toUpperCase()} />

      <WeekStrip selectedDate={selectedDate} onSelectDate={handleDateSelect} itemDates={itemDates} />

      {/* Date heading + Add item button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{selectedDateLabel}</p>
        {canEdit && !showAddItem && (
          <button
            type="button"
            onClick={() => setShowAddItem(true)}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:bg-slate-800/50"
          >
            + Add item
          </button>
        )}
      </div>

      {/* Add item form */}
      {showAddItem && (
        <form onSubmit={handleAddItem} className="mx-4 mb-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Title</label>
              <input required value={newItem.title} onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} className={INPUT} placeholder="Item title" />
            </div>
            <div>
              <label className={LABEL}>Date</label>
              <input type="date" required value={newItem.date} onChange={(e) => setNewItem((n) => ({ ...n, date: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Start time</label>
              <input type="time" required value={newItem.start_time} onChange={(e) => setNewItem((n) => ({ ...n, start_time: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>End time <span className="text-slate-500">(optional)</span></label>
              <input type="time" value={newItem.end_time} onChange={(e) => setNewItem((n) => ({ ...n, end_time: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Location <span className="text-slate-500">(optional)</span></label>
              <input value={newItem.location} onChange={(e) => setNewItem((n) => ({ ...n, location: e.target.value }))} className={INPUT} placeholder="Room A" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Description <span className="text-slate-500">(optional)</span></label>
              <textarea rows={2} value={newItem.description} onChange={(e) => setNewItem((n) => ({ ...n, description: e.target.value }))} className={INPUT} />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors focus:ring-offset-slate-950">
                  Add item
                </button>
                <button type="button" onClick={() => { setShowAddItem(false); setSaveError(''); }} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div className="relative px-4 py-2">
        <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-slate-800" style={{ left: '60px' }} />

        {dayItems.length === 0 && !showAddItem && (
          <p className="py-8 text-center text-sm text-slate-500">No items for this day.</p>
        )}

        {dayItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const isEditing = editingId === item.id;

          return (
            <div key={item.id} className="mb-1.5 flex gap-2.5">
              <span className="min-w-[28px] pt-2.5 text-[10px] tabular-nums text-slate-500">
                {formatTime(item.start_time)}
              </span>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full rounded-t-lg border px-3 py-2 text-left transition-colors ${
                    isExpanded
                      ? 'border-slate-700 border-b-0 bg-slate-900/50'
                      : 'rounded-b-lg border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <p className={`text-sm font-medium ${isExpanded ? 'font-semibold text-slate-100' : 'text-slate-200'}`}>
                    {item.title}
                  </p>
                  {(item.end_time || item.location) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.end_time ? `${formatTime(item.start_time)} – ${formatTime(item.end_time)}` : formatTime(item.start_time)}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                  )}
                </button>

                {isExpanded && (
                  <div className="rounded-b-lg border border-t-0 border-slate-700 bg-slate-900/50 overflow-hidden">
                    {isEditing && editValues ? (
                      /* Edit form */
                      <div className="p-3">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="col-span-2">
                            <label className={LABEL}>Title</label>
                            <input value={editValues.title} onChange={(e) => setEditValues((v) => v ? { ...v, title: e.target.value } : v)} className={INPUT} />
                          </div>
                          <div>
                            <label className={LABEL}>Date</label>
                            <input type="date" value={editValues.date} onChange={(e) => setEditValues((v) => v ? { ...v, date: e.target.value } : v)} className={INPUT} />
                          </div>
                          <div>
                            <label className={LABEL}>Start time</label>
                            <input type="time" value={editValues.start_time} onChange={(e) => setEditValues((v) => v ? { ...v, start_time: e.target.value } : v)} className={INPUT} />
                          </div>
                          <div>
                            <label className={LABEL}>End time</label>
                            <input type="time" value={editValues.end_time} onChange={(e) => setEditValues((v) => v ? { ...v, end_time: e.target.value } : v)} className={INPUT} />
                          </div>
                          <div>
                            <label className={LABEL}>Location</label>
                            <input value={editValues.location} onChange={(e) => setEditValues((v) => v ? { ...v, location: e.target.value } : v)} className={INPUT} />
                          </div>
                          <div className="col-span-2">
                            <label className={LABEL}>Description</label>
                            <textarea rows={2} value={editValues.description} onChange={(e) => setEditValues((v) => v ? { ...v, description: e.target.value } : v)} className={INPUT} />
                          </div>
                        </div>
                        {saveError && <p className="mb-2 text-sm text-red-400">{saveError}</p>}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleSaveEdit(item)} disabled={saving}
                            className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-40 transition-colors focus:ring-offset-slate-950">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => { setEditingId(null); setSaveError(''); }}
                            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                            <p className="text-xs text-slate-500">
                              {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                              {item.location ? ` · ${item.location}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {canEdit && (
                              <>
                                <button type="button" onClick={() => startEdit(item)} className="text-xs font-medium text-slate-400 underline hover:text-slate-200">
                                  Edit
                                </button>
                                <button type="button" onClick={() => handleDeleteItem(item.id)} className="text-xs font-medium text-red-400 hover:underline">
                                  Delete
                                </button>
                              </>
                            )}
                            <button type="button" onClick={() => setExpandedId(null)} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
                              ×
                            </button>
                          </div>
                        </div>
                        <CommentThread itemId={item.id} token={token} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Share modal */}
      {showShare && token && (
        <ShareModal agendaId={id} token={token} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
