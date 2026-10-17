import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env (reinicia npm run dev tras editarlo)');
}

// Clave publicable: segura en el navegador porque las tablas tienen RLS
export const supabase = createClient(url, key);