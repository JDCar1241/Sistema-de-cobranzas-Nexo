import { supabase } from '../config/supabase.js';
import { HttpError, asyncH } from '../utils/HttpError.js';

// Verifica el token de sesión de Supabase y carga el perfil (rol) del usuario
export const autenticar = asyncH(async (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) throw new HttpError(401, 'Falta el token de sesión');

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Sesión inválida o expirada');

  const { data: perfil, error: e2 } = await supabase
    .from('perfiles')
    .select('nombre, rol, activo')
    .eq('id', data.user.id)
    .maybeSingle();
  if (e2) throw new HttpError(500, 'No se pudo verificar el perfil del usuario');
  if (!perfil || !perfil.activo) throw new HttpError(403, 'Este usuario no tiene acceso al sistema');

  req.user = { id: data.user.id, email: data.user.email, nombre: perfil.nombre, rol: perfil.rol };
  next();
});