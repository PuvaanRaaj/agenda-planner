import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_ANON_KEY ?? '';
const email = process.env.SUPABASE_EMAIL ?? '';
const password = process.env.SUPABASE_PASSWORD ?? '';

if (!url || !key || !email || !password) {
  console.error(
    'Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_EMAIL, SUPABASE_PASSWORD',
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error || !data.session) {
  console.error('Login failed:', error?.message ?? 'no session returned');
  process.exit(1);
}

console.log('\nRefresh token (copy this into your MCP config):\n');
console.log(data.session.refresh_token);
console.log();
