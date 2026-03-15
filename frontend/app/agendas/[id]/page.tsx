'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { agendasApi, itemsApi, type Agenda, type AgendaItem } from '@/lib/api';
import TopNav from '@/components/TopNav';
import WeekStrip from '@/components/WeekStrip';
import CommentThread from '@/components/CommentThread';
import ShareModal from '@/components/ShareModal';

const INPUT = 'w-full rounded-md border border-[#222222] bg-[#161616] px-3 py-2 text-sm text-[#fafafa] placeholder:text-[#444] focus:border-[#444] focus:outline-none';
const LABEL = 'mb-1 block text-[11px] font-medium text-[#666]';

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
    } catch { /* ignore */ }
    finally { setSaving(false); }
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
    } catch { /* ignore */ }
  }

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111]">
        <TopNav />
        <div className="flex gap-1 border-b border-[#1a1a1a] px-4 py-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-12 flex-1 animate-pulse rounded-md bg-[#161616]" />
          ))}
        </div>
        <div className="px-4 py-4 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-[#161616]" />)}
        </div>
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-[#111111]">
        <TopNav />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#555]">Agenda not found.</p>
          <button type="button" onClick={() => router.push('/dashboard')}
            className="text-sm text-[#555] underline hover:text-[#fafafa]">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const navRight = (
    <>
      <button type="button" onClick={() => setShowShare(true)}
        className="rounded-md px-2.5 py-1.5 text-sm text-[#555] transition-colors hover:bg-[#161616] hover:text-[#fafafa]">
        Share
      </button>
      <button type="button" onClick={() => router.push(`/agendas/${id}/edit`)}
        className="rounded-md px-2.5 py-1.5 text-sm text-[#555] transition-colors hover:bg-[#161616] hover:text-[#fafafa]">
        Edit
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-[#111111]">
      <TopNav breadcrumb={agenda.title} right={navRight} userInitial={(userEmail[0] ?? '?').toUpperCase()} />

      <WeekStrip selectedDate={selectedDate} onSelectDate={handleDateSelect} itemDates={itemDates} />

      {/* Date heading + Add item button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#555]">{selectedDateLabel}</p>
        {token && !showAddItem && (
          <button type="button" onClick={() => setShowAddItem(true)}
            className="rounded-md border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#888] transition-colors hover:border-[#444] hover:text-[#fafafa]">
            + Add item
          </button>
        )}
      </div>

      {/* Add item form */}
      {showAddItem && (
        <form onSubmit={handleAddItem} className="mx-4 mb-3 rounded-lg border border-[#2a2a2a] bg-[#161616] p-4">
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
              <label className={LABEL}>End time <span className="text-[#444]">(optional)</span></label>
              <input type="time" value={newItem.end_time} onChange={(e) => setNewItem((n) => ({ ...n, end_time: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Location <span className="text-[#444]">(optional)</span></label>
              <input value={newItem.location} onChange={(e) => setNewItem((n) => ({ ...n, location: e.target.value }))} className={INPUT} placeholder="Room A" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Description <span className="text-[#444]">(optional)</span></label>
              <textarea rows={2} value={newItem.description} onChange={(e) => setNewItem((n) => ({ ...n, description: e.target.value }))} className={INPUT} />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="rounded-md bg-[#fafafa] px-4 py-1.5 text-sm font-semibold text-[#111] hover:bg-[#e5e5e5] transition-colors">
                Add item
              </button>
              <button type="button" onClick={() => setShowAddItem(false)} className="rounded-md px-4 py-1.5 text-sm text-[#555] hover:bg-[#1a1a1a] hover:text-[#fafafa] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div className="relative px-4 py-2">
        {/* vertical line */}
        <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#1f1f1f]" style={{ left: '60px' }} />

        {dayItems.length === 0 && !showAddItem && (
          <p className="py-8 text-center text-sm text-[#444]">No items for this day.</p>
        )}

        {dayItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const isEditing = editingId === item.id;

          return (
            <div key={item.id} className="mb-1.5 flex gap-2.5">
              <span className="min-w-[28px] pt-2.5 text-[10px] tabular-nums text-[#444]">
                {formatTime(item.start_time)}
              </span>
              <div className="flex-1">
                {/* Item card */}
                {/* When expanded, use rounded-t-md only so the card merges seamlessly
                    with the expand panel below. rounded-md would leave rounded bottom
                    corners that create a visible gap at the join. */}
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    isExpanded
                      ? 'rounded-t-md border border-[#fafafa] bg-[#fafafa]'
                      : 'rounded-md border border-[#222222] bg-[#161616] hover:border-[#2a2a2a] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <p className={`text-sm font-medium ${isExpanded ? 'font-semibold text-[#111]' : 'text-[#ddd]'}`}>
                    {item.title}
                  </p>
                  {(item.end_time || item.location) && (
                    <p className={`mt-0.5 text-[11px] ${isExpanded ? 'text-[#666]' : 'text-[#555]'}`}>
                      {item.end_time ? `${formatTime(item.start_time)} – ${formatTime(item.end_time)}` : formatTime(item.start_time)}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                  )}
                </button>

                {/* Inline expand panel */}
                {isExpanded && (
                  <div className="rounded-b-md border border-t-0 border-[#222222] bg-[#0d0d0d] overflow-hidden">
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
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleSaveEdit(item)} disabled={saving}
                            className="rounded-md bg-[#fafafa] px-3 py-1.5 text-sm font-semibold text-[#111] hover:bg-[#e5e5e5] disabled:opacity-40 transition-colors">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => setEditingId(null)}
                            className="rounded-md px-3 py-1.5 text-sm text-[#555] hover:bg-[#161616] hover:text-[#fafafa] transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Comment view */
                      <>
                        <div className="flex items-start justify-between border-b border-[#1f1f1f] px-3 py-2.5">
                          <div>
                            <p className="text-sm font-semibold text-[#fafafa]">{item.title}</p>
                            <p className="text-[11px] text-[#555]">
                              {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                              {item.location ? ` · ${item.location}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {token && (
                              <>
                                <button type="button" onClick={() => startEdit(item)}
                                  className="text-xs text-[#555] underline hover:text-[#fafafa]">
                                  Edit
                                </button>
                                <button type="button" onClick={() => handleDeleteItem(item.id)}
                                  className="text-xs text-red-400 hover:underline">
                                  Delete
                                </button>
                              </>
                            )}
                            <button type="button" onClick={() => setExpandedId(null)}
                              className="text-base leading-none text-[#444] hover:text-[#fafafa]">
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
