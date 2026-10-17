import { supabase } from '../config/supabase.js';
import { asyncH, HttpError } from '../utils/HttpError.js';

const ROLES = ['administrador', 'asesor', 'cobranzas', 'gerente'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listar = asyncH(async (_req, res) => {
  const { data: perfiles, error } = await supabase
    .from('perfiles').select('id, nombre, rol, activo, created_at').order('created_at');
  if (error) throw new HttpError(500, 'No se pudo listar usuarios');

  const { data: auth, error: e2 } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (e2) throw new HttpError(500, 'No se pudo listar usuarios');
  const emails = new Map(auth.users.map((u) => [u.id, u.email]));

  res.json(perfiles.map((p) => ({ ...p, email: emails.get(p.id) ?? null })));
});

export const crear = asyncH(async (req, res) => {
  const { email, password, nombre, rol } = req.body ?? {};
  if (!EMAIL.test(email ?? '')) throw new HttpError(400, 'Correo inválido');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
  if (!nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!ROLES.includes(rol)) throw new HttpError(400, `Rol inválido. Opciones: ${ROLES.join(', ')}`);

  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const existe = error.code === 'email_exists' || /already/i.test(error.message);
    throw new HttpError(existe ? 409 : 400, existe ? 'Ya existe un usuario con ese correo' : error.message);
  }

  const { error: e2 } = await supabase.from('perfiles').insert({ id: data.user.id, nombre: nombre.trim(), rol });
  if (e2) {
    await supabase.auth.admin.deleteUser(data.user.id); // no dejar usuario sin perfil
    throw new HttpError(500, 'No se pudo crear el perfil del usuario');
  }
  res.status(201).json({ id: data.user.id, email, nombre: nombre.trim(), rol, activo: true });
});

export const actualizar = asyncH(async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, activo } = req.body ?? {};
  const cambios = {};

  if (nombre !== undefined) {
    if (!nombre.trim()) throw new HttpError(400, 'El nombre no puede estar vacío');
    cambios.nombre = nombre.trim();
  }
  if (rol !== undefined) {
    if (!ROLES.includes(rol)) throw new HttpError(400, 'Rol inválido');
    cambios.rol = rol;
  }
  if (activo !== undefined) {
    if (typeof activo !== 'boolean') throw new HttpError(400, 'activo debe ser true o false');
    cambios.activo = activo;
  }
  if (!Object.keys(cambios).length) throw new HttpError(400, 'No hay cambios que aplicar');

  if (id === req.user.id && (cambios.activo === false || (cambios.rol && cambios.rol !== 'administrador'))) {
    throw new HttpError(400, 'No puedes desactivarte ni quitarte tu propio rol de administrador');
  }

  const { data, error } = await supabase.from('perfiles').update(cambios).eq('id', id).select().maybeSingle();
  if (error) throw new HttpError(500, 'No se pudo actualizar el usuario');
  if (!data) throw new HttpError(404, 'Usuario no encontrado');
  res.json(data);
});

export const cambiarPassword = asyncH(async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
  const { error } = await supabase.auth.admin.updateUserById(req.params.id, { password });
  if (error) throw new HttpError(400, 'No se pudo cambiar la contraseña');
  res.json({ ok: true });
});