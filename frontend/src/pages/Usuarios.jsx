import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { ETIQUETA_ROL } from '../config/rutas';

const ROLES = Object.keys(ETIQUETA_ROL);
const VACIO = { email: '', password: '', nombre: '', rol: 'asesor' };

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [form, setForm] = useState(null);   // { modo: 'nuevo' | 'editar' | 'clave', ...datos }
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const r = await api('/usuarios');
      setLista(Array.isArray(r) ? r : r.usuarios || r.data || []);
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (f) => { setForm(f); setErrorForm(''); setOk(''); };

  async function guardar(e) {
    e.preventDefault();
    setErrorForm('');

    if (form.modo === 'nuevo') {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErrorForm('El correo no es válido.');
      if (!form.nombre.trim()) return setErrorForm('Falta el nombre.');
    }
    if (form.modo !== 'editar' && form.password.length < 8)
      return setErrorForm('La contraseña debe tener al menos 8 caracteres.');
    if (form.modo === 'editar' && !form.nombre.trim()) return setErrorForm('Falta el nombre.');

    setGuardando(true);
    try {
      if (form.modo === 'nuevo') {
        await api('/usuarios', {
          method: 'POST',
          body: { email: form.email.trim(), password: form.password, nombre: form.nombre.trim(), rol: form.rol },
        });
        setOk('Usuario creado.');
      } else if (form.modo === 'editar') {
        await api(`/usuarios/${form.id}`, {
          method: 'PATCH',
          body: { nombre: form.nombre.trim(), rol: form.rol, activo: form.activo },
        });
        setOk('Cambios guardados.');
      } else {
        await api(`/usuarios/${form.id}/password`, { method: 'POST', body: { password: form.password } });
        setOk('Contraseña actualizada.');
      }
      setForm(null);
      cargar();
    } catch (err) {
      setErrorForm(err.message);
    }
    setGuardando(false);
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Usuarios</h1>
          <p className="suave">Crea al personal y asigna sus roles. Desactiva en vez de eliminar.</p>
        </div>
        <button className="btn btn-auto" onClick={() => abrir({ modo: 'nuevo', ...VACIO })}>Nuevo usuario</button>
      </div>

      {ok && <div className="alerta alerta-ok">{ok}</div>}
      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      {form && (
        <form onSubmit={guardar} noValidate className="tarjeta" style={{ marginBottom: '1.25rem' }}>
          <h2>
            {form.modo === 'nuevo' && 'Nuevo usuario'}
            {form.modo === 'editar' && `Editar a ${form.titulo}`}
            {form.modo === 'clave' && `Nueva contraseña para ${form.titulo}`}
          </h2>

          {form.modo === 'nuevo' && (
            <div className="campo">
              <label htmlFor="u_email">Correo</label>
              <input id="u_email" type="email" value={form.email} onChange={set('email')} autoComplete="off" />
            </div>
          )}
          {form.modo !== 'clave' && (
            <div className="grid-2">
              <div className="campo">
                <label htmlFor="u_nombre">Nombre</label>
                <input id="u_nombre" value={form.nombre} onChange={set('nombre')} />
              </div>
              <div className="campo">
                <label htmlFor="u_rol">Rol</label>
                <select id="u_rol" value={form.rol} onChange={set('rol')}>
                  {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                </select>
              </div>
            </div>
          )}
          {form.modo !== 'editar' && (
            <div className="campo">
              <label htmlFor="u_pass">Contraseña (mínimo 8 caracteres)</label>
              <input id="u_pass" type="text" value={form.password} onChange={set('password')} autoComplete="new-password" />
            </div>
          )}
          {form.modo === 'editar' && (
            <label className="check">
              <input type="checkbox" checked={form.activo} onChange={set('activo')} /> Usuario activo
            </label>
          )}

          {errorForm && <div className="alerta alerta-error" role="alert">{errorForm}</div>}
          <div className="acciones" style={{ marginTop: '.5rem' }}>
            <button className="btn btn-auto" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" className="btn btn-sec btn-auto" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {cargando && <tr><td colSpan="5" className="tabla-vacia">Cargando…</td></tr>}
            {!cargando && lista.length === 0 && <tr><td colSpan="5" className="tabla-vacia">No hay usuarios.</td></tr>}
            {!cargando && lista.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.nombre}</strong></td>
                <td>{u.email || '—'}</td>
                <td>{ETIQUETA_ROL[u.rol] || u.rol}</td>
                <td>
                  <span className={`badge ${u.activo ? 'badge-vigente' : 'badge-cancelado'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="celda-acciones">
                  <button className="btn-enlace"
                    onClick={() => abrir({ modo: 'editar', id: u.id, titulo: u.nombre, nombre: u.nombre, rol: u.rol, activo: !!u.activo })}>
                    Editar
                  </button>
                  <button className="btn-enlace"
                    onClick={() => abrir({ modo: 'clave', id: u.id, titulo: u.nombre, password: '' })}>
                    Cambiar contraseña
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}