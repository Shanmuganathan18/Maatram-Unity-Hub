/**
 * src/config/supabase.js
 * Two Supabase clients:
 *   - supabase: anon key (used in token verification helper)
 *   - supabaseAdmin: service role key (used to create/manage Auth users server-side)
 *
 * NEVER expose supabaseAdmin or the service role key to any frontend.
 */
const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

/** Public client — only for token verification */
const supabase = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Admin client — server-side user management */
const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase, supabaseAdmin };

