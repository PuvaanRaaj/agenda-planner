import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : '';
const anonKey = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') : '';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!_client) {
    _client = createClient(url, anonKey);
  }
  return _client;
}

export type Session = { access_token: string; user: { id: string; email?: string; user_metadata?: { name?: string } } };
