import { createClient } from '@supabase/supabase-js';

const AGENDA_API_URL = process.env.AGENDA_API_URL ?? 'http://localhost:8080';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const SUPABASE_REFRESH_TOKEN = process.env.SUPABASE_REFRESH_TOKEN ?? '';

export class ApiClient {
  private accessToken: string | null = null;
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /** Call once at startup — awaits the first token exchange. */
  async init(): Promise<void> {
    await this.refresh();
    // Refresh every 55 minutes (access tokens expire after 60 minutes).
    // Null out the token on failure so getToken() surfaces the human-readable
    // "re-run get-token.ts" message rather than sending a stale expired token.
    setInterval(() => {
      this.accessToken = null;
      this.refresh().catch(console.error);
    }, 55 * 60 * 1000);
  }

  private async refresh(): Promise<void> {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: SUPABASE_REFRESH_TOKEN,
    });
    if (error || !data.session?.access_token) {
      throw new Error(
        `Auth refresh failed: ${error?.message ?? 'no access token returned'}`,
      );
    }
    this.accessToken = data.session.access_token;
  }

  private getToken(): string {
    if (!this.accessToken) {
      throw new Error(
        'Auth refresh failed — re-run get-token.ts to get a new refresh token',
      );
    }
    return this.accessToken;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${AGENDA_API_URL}${path}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (!res.ok) {
      throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${AGENDA_API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${AGENDA_API_URL}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`PATCH ${path} → ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async del(path: string): Promise<void> {
    const res = await fetch(`${AGENDA_API_URL}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (!res.ok) {
      throw new Error(`DELETE ${path} → ${res.status}: ${await res.text()}`);
    }
  }
}
