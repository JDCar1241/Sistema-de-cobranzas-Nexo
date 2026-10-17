import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { soles, fecha, hoyLima, METODO, descargarCsv } from '../lib/fmt';

export default function Reportes() {
  const hoy = hoyLima();
  const [tipo, setTipo] = useState('pagos');
  const [desde, setDesde] = useState(hoy.slice(0, 8) + '01');
  const [hasta, setHasta] = useState(hoy);
  const [estado, setEstado] = useState('todos');
  const [pagos, setPagos] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError('');
      if (tipo === 'pagos') {
        if (!desde || !hasta || desde > hasta) {
          setError('Revisa el periodo: la fecha inicial debe ser anterior a la final.');
          setPagos([]); setCargando(false); return;
        }
        const { data, error: e } = await supabase
          .from('pagos')
          .select('codigo, importe, fecha_pago, metodo, prestamos(codigo, clientes(nombre_mostrar)), cuotas(numero)')
          .gte('fecha_pago', desde).lte('fecha_pago', hasta)
          .order('fecha_pago', { ascending: false }).limit(5000);
        if (cancelado) return;
        if (e) setError('No se pudo generar el reporte.'); else setPagos(data || []);
      } else {
        let c = supabase
          .from('v_prestamos')
          .select('codigo, cliente, saldo_pendiente, saldo_vencido, estado_actual, primer_vencimiento_pendiente, total_a_pagar')
          .gt('saldo_pendiente', 0).order('saldo_pendiente', { ascending: false }).limit(5000);
        if (estado !== 'todos') c = c.eq('estado_actual', estado);
        const { data, error: e } = await c;
        if (cancelado) return;
        if (e) setError('No se pudo generar el reporte.'); else setSaldos(data || []);
      }
      setCargando(false);
    })();
    return () => { cancelado = true; };
  }, [tipo, desde, hasta, estado]);

  const totalPagos = pagos.reduce((s, p) => s + Number(p.importe), 0);
  const porMetodo = pagos.reduce((a, p) => ({ ...a, [p.metodo]: (a[p.metodo] || 0) + Number(p.importe) }), {});
  const totalSaldos = saldos.reduce((s, p) => s + Number(p.saldo_pendiente), 0);
  const totalVencido = saldos.reduce((s, p) => s + Number(p.saldo_vencido), 0);

  function exportar() {
    if (tipo === 'pagos') {
      descargarCsv(`pagos_${desde}_a_${hasta}.csv`,
        ['Código', 'Fecha', 'Cliente', 'Préstamo', 'Cuota', 'Método', 'Importe'],
        pagos.map((p) => [p.codigo, fecha(p.fecha_pago), p.prestamos?.clientes?.nombre_mostrar,
          p.prestamos?.codigo, p.cuotas?.numero, METODO[p.metodo], Number(p.importe).toFixed(2)]));
    } else {
      descargarCsv(`saldos_pendientes_${hoy}.csv`,
        ['Préstamo', 'Cliente', 'Estado', 'Próx. vencimiento', 'Total a pagar', 'Saldo pendiente', 'Saldo vencido'],
        saldos.map((s) => [s.codigo, s.cliente, s.estado_actual, fecha(s.primer_vencimiento_pendiente),
          Number(s.total_a_pagar).toFixed(2), Number(s.saldo_pendiente).toFixed(2), Number(s.saldo_vencido).toFixed(2)]));
    }
  }

  const hayDatos = tipo === 'pagos' ? pagos.length > 0 : saldos.length > 0;

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Reportes</h1>
          <p className="suave">Pagos y saldos pendientes. Puedes exportarlos a CSV para abrirlos en Excel.</p>
        </div>
        <button className="btn btn-sec btn-auto" onClick={exportar} disabled={!hayDatos}>Exportar CSV</button>
      </div>

      <div className="barra-filtros">
        <div className="segmentado" role="group" aria-label="Tipo de reporte">
          <button type="button" className={tipo === 'pagos' ? 'activo' : ''} onClick={() => setTipo('pagos')}>Pagos por periodo</button>
          <button type="button" className={tipo === 'saldos' ? 'activo' : ''} onClick={() => setTipo('saldos')}>Saldos pendientes</button>
        </div>

        {tipo === 'pagos' ? (
          <div className="filtro-fechas">
            <label>Desde <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></label>
            <label>Hasta <input type="date" value={hasta} max={hoy} onChange={(e) => setHasta(e.target.value)} /></label>
          </div>
        ) : (
          <div className="segmentado" role="group" aria-label="Estado">
            {[['todos', 'Todos'], ['vigente', 'Vigentes'], ['vencido', 'Vencidos']].map(([v, t]) => (
              <button key={v} type="button" className={estado === v ? 'activo' : ''} onClick={() => setEstado(v)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      {tipo === 'pagos' ? (
        <>
          <div className="resumen">
            <div className="resumen-item"><span className="suave chico">Total cobrado</span><strong>{soles(totalPagos)}</strong></div>
            <div className="resumen-item"><span className="suave chico">N.º de pagos</span><strong>{pagos.length}</strong></div>
            {Object.keys(METODO).slice(0, 2).map((m) => (
              <div key={m} className="resumen-item">
                <span className="suave chico">{METODO[m]}</span><strong>{soles(porMetodo[m] || 0)}</strong>
              </div>
            ))}
          </div>
          <p className="suave chico">Efectivo: {soles(porMetodo.efectivo || 0)}</p>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Préstamo</th><th>Cuota</th><th>Método</th><th>Importe</th></tr></thead>
              <tbody>
                {cargando && <tr><td colSpan="7" className="tabla-vacia">Cargando…</td></tr>}
                {!cargando && pagos.length === 0 && <tr><td colSpan="7" className="tabla-vacia">No hay pagos en este periodo.</td></tr>}
                {!cargando && pagos.map((p) => (
                  <tr key={p.codigo}>
                    <td>{p.codigo}</td><td>{fecha(p.fecha_pago)}</td>
                    <td>{p.prestamos?.clientes?.nombre_mostrar}</td><td>{p.prestamos?.codigo}</td>
                    <td>{p.cuotas?.numero}</td><td>{METODO[p.metodo]}</td><td>{soles(p.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="resumen resumen-3">
            <div className="resumen-item"><span className="suave chico">Préstamos con saldo</span><strong>{saldos.length}</strong></div>
            <div className="resumen-item"><span className="suave chico">Saldo pendiente</span><strong>{soles(totalSaldos)}</strong></div>
            <div className="resumen-item"><span className="suave chico">De ese saldo, vencido</span><strong className="txt-error">{soles(totalVencido)}</strong></div>
          </div>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Préstamo</th><th>Cliente</th><th>Estado</th><th>Próx. vencimiento</th><th>Total</th><th>Saldo pendiente</th><th>Vencido</th></tr></thead>
              <tbody>
                {cargando && <tr><td colSpan="7" className="tabla-vacia">Cargando…</td></tr>}
                {!cargando && saldos.length === 0 && <tr><td colSpan="7" className="tabla-vacia">No hay saldos pendientes.</td></tr>}
                {!cargando && saldos.map((s) => (
                  <tr key={s.codigo}>
                    <td>{s.codigo}</td><td>{s.cliente}</td>
                    <td><span className={`badge badge-${s.estado_actual}`}>{s.estado_actual}</span></td>
                    <td>{fecha(s.primer_vencimiento_pendiente)}</td>
                    <td>{soles(s.total_a_pagar)}</td><td>{soles(s.saldo_pendiente)}</td>
                    <td className={Number(s.saldo_vencido) > 0 ? 'txt-error' : ''}>{soles(s.saldo_vencido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}