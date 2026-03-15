import { createClient } from '@supabase/supabase-js';

const url = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : '';
const anonKey = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '') : '';

export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, anonKey);
}

export type Session = { access_token: string; user: { id: string; email?: string; user_metadata?: { name?: string } } };
