const API_URL = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') : 'http://localhost:8080';

type FetchOptions = RequestInit & { token?: string; shareToken?: string };

async function api<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, shareToken, headers = {}, ...init } = options;
  const h: Record<string, string> = { ...(headers as Record<string, string>) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (shareToken) h['X-Share-Token'] = shareToken;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: h });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = JSON.parse(text);
      if (j.error) msg = j.error;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export type User = { id: string; email: string; name?: string; created_at: string };
export type Agenda = {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  visibility: string;
  item_count?: number;
  role?: string;
  created_at: string;
  updated_at: string;
  items?: AgendaItem[];
};
export type AgendaItem = {
  id: string;
  agenda_id: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
};
export type Comment = {
  id: string;
  item_id: string;
  user_id?: string;
  body: string;
  created_at: string;
  email?: string;
  name?: string;
};
export type AgendaMember = { id: string; agenda_id: string; user_id: string; role: string; email?: string; name?: string };

export const authApi = {
  sync: (body: { id: string; email: string; name?: string }, token: string) =>
    api<void>('/auth/sync', { method: 'POST', body: JSON.stringify(body), token }),
};

export const agendasApi = {
  list: (token: string) => api<Agenda[]>('/agendas', { token }),
  get: (id: string, token: string) => api<Agenda>(`/agendas/${id}`, { token }),
  create: (body: { title: string; description?: string; visibility?: string }, token: string) =>
    api<Agenda>('/agendas', { method: 'POST', body: JSON.stringify(body), token }),
  update: (id: string, body: { title?: string; description?: string; visibility?: string }, token: string) =>
    api<Agenda>(`/agendas/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),
  delete: (id: string, token: string) => api<void>(`/agendas/${id}`, { method: 'DELETE', token }),
};

export const itemsApi = {
  create: (agendaId: string, body: { title: string; description?: string; location?: string; date: string; start_time: string; end_time?: string }, token: string) =>
    api<AgendaItem>(`/agendas/${agendaId}/items`, { method: 'POST', body: JSON.stringify(body), token }),
  update: (agendaId: string, itemId: string, body: Partial<{ title: string; description: string; location: string; date: string; start_time: string; end_time: string }>, token: string) =>
    api<AgendaItem>(`/agendas/${agendaId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(body), token }),
  delete: (agendaId: string, itemId: string, token: string) =>
    api<void>(`/agendas/${agendaId}/items/${itemId}`, { method: 'DELETE', token }),
};

export type ShareResponse = { permission: string; agenda: Agenda };

export const shareApi = {
  byToken: (token: string) => api<ShareResponse>(`/share/${token}`),
  createToken: (agendaId: string, body: { permission: string; expires_at?: string }, token: string) =>
    api<{ token: string }>(`/agendas/${agendaId}/share`, { method: 'POST', body: JSON.stringify(body), token }),
  members: (agendaId: string, token: string) => api<AgendaMember[]>(`/agendas/${agendaId}/members`, { token }),
  updateMember: (agendaId: string, userId: string, body: { role: string }, token: string) =>
    api<AgendaMember>(`/agendas/${agendaId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(body), token }),
};

export const commentsApi = {
  list: (itemId: string, token?: string, shareToken?: string) =>
    api<Comment[]>(`/items/${itemId}/comments`, { token, shareToken }),
  create: (itemId: string, body: { body: string }, token?: string, shareToken?: string) =>
    api<Comment>(`/items/${itemId}/comments`, { method: 'POST', body: JSON.stringify(body), token, shareToken }),
  delete: (commentId: string, token: string) =>
    api<void>(`/comments/${commentId}`, { method: 'DELETE', token }),
};
