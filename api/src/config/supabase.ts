import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Server-scoped client using only the public anon/publishable key.
 * Use request-scoped clients with the caller's access token for RLS-protected
 * user operations; never replace this key with service_role in browser code.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
