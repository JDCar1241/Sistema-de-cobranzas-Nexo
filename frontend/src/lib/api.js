import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Llama al backend Node enviando la sesión del usuario
export async function api(ruta, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let resp;
  try {
    resp = await fetch(`${BASE}/api${ruta}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa que el backend esté en marcha.');
  }

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.error || 'Ocurrió un error inesperado');
  return json;
}

// Autocompletado por documento (el backend guarda el token del proveedor)
export const consultarDni = (dni) => api(`/documentos/dni/${dni}`);
export const consultarRuc = (ruc) => api(`/documentos/ruc/${ruc}`);