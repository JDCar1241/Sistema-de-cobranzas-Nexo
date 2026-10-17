import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Cliente con la clave secreta: salta el RLS. Solo se usa en el backend.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});