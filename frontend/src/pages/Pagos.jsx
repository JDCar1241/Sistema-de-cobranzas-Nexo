import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { soles, fecha, hoyLima, METODO } from '../lib/fmt';

export default function Pagos() {
  const location = useLocation();
  const prestamoInicial = location.state?.prestamoId;

  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [prestamo, setPrestamo] = useState(null);
  const [cuotas, setCuotas] = useState([]);

  const [importe, setImporte] = useState('');
  const [fechaPago, setFechaPago] = useState(hoyLima());
  const [metodo, setMetodo] = useState('efectivo');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(null);
  const [recientes, setRecientes] = useState([]);

  const cargarRecientes = useCallback(async () => {
    const { data } = await supabase
      .from('pagos')
      .select('id, codigo, importe, fecha_pago, metodo, prestamos(codigo, clientes(nombre_mostrar)), cuotas(numero)')
      .order('created_at', { ascending: false })
      .limit(15);
    setRecientes(data || []);
  }, []);

  const cargarPrestamo = useCallback(async (id) => {
    const { data: p } = await supabase
      .from('v_prestamos')
      .select('id, codigo, cliente, cliente_id, saldo_pendiente, total_a_pagar, estado_actual')
      .eq('id', id).single();
    const { data: cs } = await supabase.from('cuotas').select('*').eq('prestamo_id', id).order('numero');
    setPrestamo(p);
    setCuotas(cs || []);
  }, []);

  useEffect(() => { cargarRecientes(); }, [cargarRecientes]);
  useEffect(() => { if (prestamoInicial) cargarPrestamo(prestamoInicial); }, [prestamoInicial, cargarPrestamo]);

  useEffect(() => {
    const texto = q.replace(/[%*,()]/g, ' ').trim();
    if (texto.length < 2) { setResultados([]); return; }
    let cancelado = false;
    const t = setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from('v_prestamos')
        .select('id, codigo, cliente, saldo_pendiente, estado_actual')
        .neq('estado_actual', 'cancelado')
        .or(`codigo.ilike.*${texto}*,cliente.ilike.*${texto}*`)
        .order('codigo').limit(8);
      if (!cancelado) { setResultados(data || []); setBuscando(false); }
    }, 300);
    return () => { cancelado = true; clearTimeout(t); };
  }, [q]);

  const hoy = hoyLima();
  const pendiente = cuotas.find((c) => Number(c.saldo) > 0);
  const saldoCuota = pendiente ? Number(pendiente.saldo) : 0;
  const vencida = pendiente && pendiente.fecha_vencimiento < hoy;

  function elegir(p) {
    setQ(''); setResultados([]); setHecho(null); setError(''); setImporte('');
    cargarPrestamo(p.id);
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    const n = Number(importe);
    if (!pendiente) return setError('Este préstamo no tiene cuotas pendientes.');
    if (!(n > 0)) return setError('El importe debe ser mayor que cero.');
    if (Math.round(n * 100) !== Math.round(n * 100 + 0) || Math.abs(n * 100 - Math.round(n * 100)) > 1e-6)
      return setError('El importe admite hasta 2 decimales.');
    if (n > saldoCuota) return setError(`El importe supera el saldo de la cuota (${soles(saldoCuota)}).`);
    if (!fechaPago || fechaPago > hoy) return setError('La fecha de pago no puede ser futura.');

    setGuardando(true);
    const { data: pagoId, error: eRpc } = await supabase.rpc('registrar_pago', {
      p_cuota_id: pendiente.id,
      p_importe: Math.round(n * 100) / 100,
      p_fecha: fechaPago,
      p_metodo: metodo,
    });
    setGuardando(false);
    if (eRpc) {
      return setError(eRpc.code === '42501' ? 'Tu rol no tiene permiso para registrar pagos.' : eRpc.message);
    }

    const { data: g } = await supabase
      .from('pagos').select('codigo, saldo_prestamo').eq('id', pagoId).single();
    setHecho({ id: pagoId, codigo: g?.codigo, importe: n, saldoPrestamo: g?.saldo_prestamo });
    setImporte('');
    await cargarPrestamo(prestamo.id);
    cargarRecientes();
  }

  const cancelado = prestamo && prestamo.estado_actual === 'cancelado';

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Pagos</h1>
          <p className="suave">Se paga siempre la cuota más antigua pendiente. Los pagos no se pueden editar ni borrar.</p>
        </div>
      </div>

      {hecho && (
        <div className="alerta alerta-ok">
          Pago <strong>{hecho.codigo}</strong> de {soles(hecho.importe)} registrado.
          Saldo del préstamo: {soles(hecho.saldoPrestamo)}.{' '}
          <Link className="enlace-cliente" to={`/pagos/${hecho.id}/constancia`}><strong>Ver constancia</strong></Link>
        </div>
      )}

      <form onSubmit={guardar} noValidate className="tarjeta">
        <section>
          <h2>1. Préstamo</h2>
          {!prestamo ? (
            <div className="campo">
              <label htmlFor="buscar_pre">Buscar por código o cliente</label>
              <input id="buscar_pre" value={q} autoComplete="off" placeholder="Ej. PR-000001 o nombre"
                onChange={(e) => setQ(e.target.value)} />
              {buscando && <p className="ayuda">Buscando…</p>}
              {!buscando && q.trim().length >= 2 && resultados.length === 0 && (
                <p className="ayuda ayuda-aviso">No hay préstamos pendientes que coincidan.</p>
              )}
              {resultados.length > 0 && (
                <ul className="lista-resultados">
                  {resultados.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => elegir(p)}>
                        <span><strong>{p.codigo}</strong> · {p.cliente}</span>
                        <span className="chico">
                          <span className={`badge badge-${p.estado_actual}`}>{p.estado_actual}</span>{' '}
                          Saldo {soles(p.saldo_pendiente)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="cliente-elegido">
              <div>
                <strong>{prestamo.codigo}</strong> · {prestamo.cliente}
                <div className="suave chico">
                  <span className={`badge badge-${prestamo.estado_actual}`}>{prestamo.estado_actual}</span>{' '}
                  <Link className="enlace-cliente" to={`/prestamos/${prestamo.id}`}>Ver historial</Link>
                </div>
              </div>
              <div className="cupo">
                <span className="suave chico">Saldo del préstamo</span>
                <strong>{soles(prestamo.saldo_pendiente)}</strong>
              </div>
              <button type="button" className="btn btn-sec btn-auto btn-chico"
                onClick={() => { setPrestamo(null); setCuotas([]); setHecho(null); }}>Cambiar</button>
            </div>
          )}
        </section>

        {prestamo && cancelado && (
          <div className="alerta alerta-ok">Este préstamo está cancelado: no tiene saldo pendiente.</div>
        )}

        {prestamo && pendiente && (
          <>
            <section className="bloque">
              <h2>2. Cuota a pagar</h2>
              <div className="resumen resumen-3">
                <div className="resumen-item">
                  <span className="suave chico">Cuota</span>
                  <strong>N.º {pendiente.numero} de {cuotas.length}</strong>
                </div>
                <div className="resumen-item">
                  <span className="suave chico">Vence</span>
                  <strong className={vencida ? 'txt-error' : ''}>
                    {fecha(pendiente.fecha_vencimiento)}{vencida && ' (vencida)'}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span className="suave chico">Saldo de la cuota</span>
                  <strong>{soles(saldoCuota)}</strong>
                </div>
              </div>
            </section>

            <section className="bloque">
              <h2>3. Pago</h2>
              <div className="grid-3">
                <div className="campo">
                  <label htmlFor="importe">Importe (S/)</label>
                  <input id="importe" inputMode="decimal" placeholder="0.00" value={importe}
                    onChange={(e) => { setImporte(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')); setHecho(null); }} />
                  <button type="button" className="btn-enlace"
                    onClick={() => setImporte(String(saldoCuota))}>Pagar el saldo completo</button>
                </div>
                <div className="campo">
                  <label htmlFor="fechaPago">Fecha de pago</label>
                  <input id="fechaPago" type="date" max={hoy} value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)} />
                </div>
                <div className="campo">
                  <label htmlFor="metodo">Método</label>
                  <select id="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                    {Object.entries(METODO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {error && <div className="alerta alerta-error" role="alert">{error}</div>}
            <div className="acciones">
              <button className="btn btn-auto" disabled={guardando || !importe}>
                {guardando ? 'Registrando…' : 'Registrar pago'}
              </button>
            </div>
          </>
        )}
      </form>

      <section className="seccion" style={{ marginTop: '1.75rem' }}>
        <h2>Últimos pagos registrados</h2>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Préstamo</th><th>Cuota</th><th>Método</th><th>Importe</th><th></th></tr>
            </thead>
            <tbody>
              {recientes.length === 0 && <tr><td colSpan="8" className="tabla-vacia">Aún no hay pagos.</td></tr>}
              {recientes.map((g) => (
                <tr key={g.id}>
                  <td>{g.codigo}</td>
                  <td>{fecha(g.fecha_pago)}</td>
                  <td>{g.prestamos?.clientes?.nombre_mostrar}</td>
                  <td>{g.prestamos?.codigo}</td>
                  <td>{g.cuotas?.numero}</td>
                  <td>{METODO[g.metodo]}</td>
                  <td>{soles(g.importe)}</td>
                  <td><Link className="enlace-cliente" to={`/pagos/${g.id}/constancia`}>Constancia</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}