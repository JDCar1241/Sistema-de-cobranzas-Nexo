import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRol } from '../lib/useRol';
import { soles, fecha, fechaHora, hoyLima, METODO } from '../lib/fmt';

const VEN_PAGOS = ['administrador', 'gerente', 'cobranzas'];

export default function PrestamoDetalle() {
  const { id } = useParams();
  const rol = useRol();
  const [p, setP] = useState(null);
  const [cuotas, setCuotas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const verPagos = VEN_PAGOS.includes(rol);

  useEffect(() => {
    (async () => {
      setCargando(true);
      const { data, error: e } = await supabase.from('v_prestamos').select('*').eq('id', id).single();
      if (e) { setError('No se encontró el préstamo.'); setCargando(false); return; }
      setP(data);
      const { data: cs } = await supabase.from('cuotas').select('*').eq('prestamo_id', id).order('numero');
      setCuotas(cs || []);
      setCargando(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!verPagos) return;
    supabase.from('pagos')
      .select('id, codigo, importe, fecha_pago, metodo, saldo_cuota, saldo_prestamo, created_at, cuotas(numero)')
      .eq('prestamo_id', id).order('created_at', { ascending: false })
      .then(({ data }) => setPagos(data || []));
  }, [id, verPagos]);

  if (cargando) return <div className="estado-pantalla">Cargando…</div>;
  if (error) {
    return (
      <div className="pagina">
        <div className="alerta alerta-error" role="alert">{error}</div>
        <Link className="btn btn-sec btn-auto" to="/prestamos">Volver a préstamos</Link>
      </div>
    );
  }

  const hoy = hoyLima();
  const pagado = Number(p.total_a_pagar) - Number(p.saldo_pendiente);
  const puedeCobrar = ['administrador', 'cobranzas'].includes(rol) && p.estado_actual !== 'cancelado';

  return (
    <div className="pagina pagina-ancha">
      <p className="migas"><Link to="/prestamos">← Préstamos</Link></p>

      <div className="cabecera-pagina">
        <div>
          <h1>{p.codigo} <span className={`badge badge-${p.estado_actual}`}>{p.estado_actual}</span></h1>
          <p className="suave">
            <Link className="enlace-cliente" to={`/clientes/${p.cliente_id}`}>{p.cliente}</Link>
            {' · '}Otorgado el {fecha(p.fecha_otorgamiento)} · {p.plazo_meses} meses
          </p>
        </div>
        {puedeCobrar && (
          <Link className="btn btn-auto" to="/pagos" state={{ prestamoId: p.id }}>Registrar pago</Link>
        )}
      </div>

      <div className="resumen">
        <div className="resumen-item"><span className="suave chico">Capital</span><strong>{soles(p.monto_capital)}</strong></div>
        <div className="resumen-item"><span className="suave chico">Interés ({Number(p.tasa_interes_pct)}%)</span><strong>{soles(p.monto_interes)}</strong></div>
        <div className="resumen-item"><span className="suave chico">Pagado</span><strong>{soles(pagado)}</strong></div>
        <div className="resumen-item"><span className="suave chico">Saldo pendiente</span><strong>{soles(p.saldo_pendiente)}</strong></div>
      </div>

      <section className="seccion">
        <h2>Cronograma de cuotas</h2>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Cuota</th><th>Vence</th><th>Monto</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead>
            <tbody>
              {cuotas.map((q) => {
                const saldo = Number(q.saldo);
                const vencida = saldo > 0 && q.fecha_vencimiento < hoy;
                return (
                  <tr key={q.id}>
                    <td>{q.numero}</td>
                    <td className={vencida ? 'txt-error' : ''}>{fecha(q.fecha_vencimiento)}</td>
                    <td>{soles(q.monto)}</td>
                    <td>{soles(q.monto_pagado)}</td>
                    <td>{soles(q.saldo)}</td>
                    <td>
                      {saldo === 0 ? <span className="txt-ok">Pagada</span>
                        : vencida ? <span className="txt-error">Vencida</span>
                        : Number(q.monto_pagado) > 0 ? 'Pago parcial' : 'Pendiente'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {verPagos && (
        <section className="seccion">
          <h2>Historial de pagos</h2>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr><th>Código</th><th>Registrado</th><th>Fecha de pago</th><th>Cuota</th><th>Método</th>
                  <th>Importe</th><th>Saldo cuota</th><th>Saldo préstamo</th><th></th></tr>
              </thead>
              <tbody>
                {pagos.length === 0 && <tr><td colSpan="9" className="tabla-vacia">Aún no hay pagos registrados.</td></tr>}
                {pagos.map((g) => (
                  <tr key={g.id}>
                    <td>{g.codigo}</td>
                    <td>{fechaHora(g.created_at)}</td>
                    <td>{fecha(g.fecha_pago)}</td>
                    <td>{g.cuotas?.numero}</td>
                    <td>{METODO[g.metodo]}</td>
                    <td>{soles(g.importe)}</td>
                    <td>{soles(g.saldo_cuota)}</td>
                    <td>{soles(g.saldo_prestamo)}</td>
                    <td><Link className="enlace-cliente" to={`/pagos/${g.id}/constancia`}>Constancia</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}