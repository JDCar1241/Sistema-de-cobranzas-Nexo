import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRol } from '../lib/useRol';

export default function ClientesLista() {
  const rol = useRol();
  const puedeRegistrar = ['administrador', 'asesor', 'recepcionista'].includes(rol);

  const [q, setQ] = useState('');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      setCargando(true);
      setError('');

      let consulta = supabase
        .from('clientes')
        .select('id, tipo, dni, ruc, nombre_mostrar, telefono, correo, created_at, representantes(nombres, apellidos)')
        .order('nombre_mostrar')
        .limit(50);

      const texto = q.replace(/[%*,()]/g, ' ').trim();
      if (texto) {
        consulta = consulta.or(
          `dni.ilike.*${texto}*,ruc.ilike.*${texto}*,nombre_mostrar.ilike.*${texto}*`
        );
      }

      const { data, error: e } = await consulta;
      if (cancelado) return;
      if (e) setError('No se pudieron cargar los clientes.');
      else setFilas(data);
      setCargando(false);
    }, 300);

    return () => { cancelado = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Clientes</h1>
          <p className="suave">Busca por DNI, RUC o nombre.</p>
        </div>
        {puedeRegistrar && (
          <Link className="btn btn-auto" to="/clientes/nuevo">Registrar cliente</Link>
        )}
      </div>

      <input
        className="buscador"
        type="search"
        placeholder="Buscar cliente…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar cliente"
      />

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan="4" className="tabla-vacia">Cargando…</td></tr>
            )}
            {!cargando && filas.length === 0 && (
              <tr><td colSpan="4" className="tabla-vacia">
                {q ? 'No hay clientes que coincidan con la búsqueda.' : 'Aún no hay clientes registrados.'}
              </td></tr>
            )}
            {!cargando && filas.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link className="enlace-cliente" to={`/clientes/${c.id}`}>
                    <strong>{c.nombre_mostrar}</strong>
                  </Link>
                  {c.representantes && (
                    <div className="suave chico">
                      Rep.: {c.representantes.apellidos} {c.representantes.nombres}
                    </div>
                  )}
                </td>
                <td>{c.tipo === 'juridica' ? `RUC ${c.ruc}` : `DNI ${c.dni}`}</td>
                <td>
                  <span className={`badge ${c.tipo === 'juridica' ? 'badge-empresa' : 'badge-natural'}`}>
                    {c.tipo === 'juridica' ? 'Empresa' : 'Persona'}
                  </span>
                </td>
                <td>
                  {c.telefono || <span className="suave">—</span>}
                  {c.correo && <div className="suave chico">{c.correo}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!cargando && filas.length === 50 && (
        <p className="suave chico">Se muestran los primeros 50. Afina la búsqueda para ver otros.</p>
      )}
    </div>
  );
}