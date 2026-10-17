import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRol } from '../lib/useRol';
import { soles, fecha } from '../lib/fmt';

const FILTROS = [
  ['todos', 'Todos'],
  ['vigente', 'Vigentes'],
  ['vencido', 'Vencidos'],
  ['cancelado', 'Cancelados'],
];

export default function PrestamosLista() {
  const rol = useRol();
  const puedeRegistrar = ['administrador', 'asesor', 'recepcionista'].includes(rol);
  const [params] = useSearchParams();

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState(
    FILTROS.some(([v]) => v === params.get('estado')) ? params.get('estado') : 'todos'
  );
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      setCargando(true);
      setError('');

      let consulta = supabase
        .from('v_prestamos')
        .select('id, codigo, cliente_id, cliente, monto_capital, total_a_pagar, saldo_pendiente, plazo_meses, fecha_otorgamiento, estado_actual, cuotas_vencidas, saldo_vencido, primer_vencimiento_pendiente')
        .order('created_at', { ascending: false })
        .limit(100);

      if (estado !== 'todos') consulta = consulta.eq('estado_actual', estado);

      const texto = q.replace(/[%*,()]/g, ' ').trim();
      if (texto) consulta = consulta.or(`codigo.ilike.*${texto}*,cliente.ilike.*${texto}*`);

      const { data, error: e } = await consulta;
      if (cancelado) return;
      if (e) setError('No se pudieron cargar los préstamos.');
      else setFilas(data);
      setCargando(false);
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [q, estado]);

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Préstamos</h1>
          <p className="suave">Montos, vencimientos y saldos.</p>
        </div>
        {puedeRegistrar && <Link className="btn btn-auto" to="/prestamos/nuevo">Registrar préstamo</Link>}
      </div>

      <div className="barra-filtros">
        <input className="buscador" type="search" placeholder="Buscar por código o cliente…"
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar préstamo" />
        <div className="segmentado" role="group" aria-label="Filtrar por estado">
          {FILTROS.map(([valor, texto]) => (
            <button key={valor} type="button"
              className={estado === valor ? 'activo' : ''} onClick={() => setEstado(valor)}>
              {texto}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th><th>Cliente</th><th>Otorgado</th><th>Capital</th>
              <th>Total</th><th>Saldo</th><th>Próx. vencimiento</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan="8" className="tabla-vacia">Cargando…</td></tr>}
            {!cargando && filas.length === 0 && (
              <tr><td colSpan="8" className="tabla-vacia">
                {q || estado !== 'todos' ? 'No hay préstamos con ese filtro.' : 'Aún no hay préstamos registrados.'}
              </td></tr>
            )}
            {!cargando && filas.map((p) => (
              <tr key={p.id}>
                <td><Link className="enlace-cliente" to={`/prestamos/${p.id}`}><strong>{p.codigo}</strong></Link></td>
                <td><Link className="enlace-cliente" to={`/clientes/${p.cliente_id}`}>{p.cliente}</Link></td>
                <td>
                  {fecha(p.fecha_otorgamiento)}
                  <div className="suave chico">{p.plazo_meses} meses</div>
                </td>
                <td>{soles(p.monto_capital)}</td>
                <td>{soles(p.total_a_pagar)}</td>
                <td>
                  {soles(p.saldo_pendiente)}
                  {p.estado_actual === 'vencido' && (
                    <div className="txt-error chico">Vencido {soles(p.saldo_vencido)}</div>
                  )}
                </td>
                <td>{p.estado_actual === 'cancelado' ? '—' : fecha(p.primer_vencimiento_pendiente)}</td>
                <td>
                  <span className={`badge badge-${p.estado_actual}`}>{p.estado_actual}</span>
                  {p.estado_actual === 'vencido' && (
                    <div className="suave chico">{p.cuotas_vencidas} cuota(s)</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!cargando && filas.length === 100 && (
        <p className="suave chico">Se muestran los primeros 100. Afina la búsqueda para ver otros.</p>
      )}
    </div>
  );
}