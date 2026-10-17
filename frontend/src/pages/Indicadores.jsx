import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { soles, hoyLima, METODO } from '../lib/fmt';

export default function Indicadores() {
  const [ind, setInd] = useState(null);
  const [mes, setMes] = useState({ total: 0, cantidad: 0, metodos: {} });
  const [hoyTotal, setHoyTotal] = useState(0);
  const [clientes, setClientes] = useState(0);
  const [top, setTop] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const hoy = hoyLima();
      const inicioMes = hoy.slice(0, 8) + '01';

      const { data: i, error: e } = await supabase.from('v_indicadores').select('*').single();
      if (e) return setError('No se pudieron cargar los indicadores.');
      setInd(i);

      const { data: pagos } = await supabase
        .from('pagos').select('importe, metodo, fecha_pago').gte('fecha_pago', inicioMes).lte('fecha_pago', hoy).limit(5000);
      const metodos = {};
      let total = 0, deHoy = 0;
      (pagos || []).forEach((p) => {
        const n = Number(p.importe);
        total += n;
        if (p.fecha_pago === hoy) deHoy += n;
        metodos[p.metodo] = (metodos[p.metodo] || 0) + n;
      });
      setMes({ total, cantidad: (pagos || []).length, metodos });
      setHoyTotal(deHoy);

      const { count } = await supabase.from('clientes').select('id', { count: 'exact', head: true });
      setClientes(count || 0);

      const { data: t } = await supabase
        .from('v_cobranza').select('prestamo_id, codigo, cliente, saldo_vencido, cuotas_vencidas')
        .order('saldo_vencido', { ascending: false }).limit(5);
      setTop(t || []);
    })();
  }, []);

  if (error) return <div className="pagina"><div className="alerta alerta-error" role="alert">{error}</div></div>;
  if (!ind) return <div className="estado-pantalla">Cargando…</div>;

  const total = Number(ind.total_prestamos) || 0;
  const pct = (n) => (total ? (Number(n) / total) * 100 : 0);
  const prestado = Number(ind.monto_total_prestado);
  const pendiente = Number(ind.saldo_total_pendiente);

  const barras = [
    ['Vigentes', ind.prestamos_vigentes, 'barra-ok'],
    ['Vencidos', ind.prestamos_vencidos, 'barra-error'],
    ['Cancelados', ind.prestamos_cancelados, 'barra-gris'],
  ];

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Indicadores</h1>
          <p className="suave">Situación general de préstamos y cobranzas.</p>
        </div>
      </div>

      <div className="resumen">
        <div className="resumen-item"><span className="suave chico">Capital prestado (histórico)</span><strong>{soles(prestado)}</strong></div>
        <div className="resumen-item"><span className="suave chico">Saldo por cobrar</span><strong>{soles(pendiente)}</strong></div>
        <div className="resumen-item"><span className="suave chico">Cobrado este mes</span><strong>{soles(mes.total)}</strong></div>
        <div className="resumen-item"><span className="suave chico">Cobrado hoy</span><strong>{soles(hoyTotal)}</strong></div>
      </div>

      <div className="grid-2 grid-cards">
        <section className="tarjeta">
          <h2>Préstamos por estado <span className="suave chico">({total} en total)</span></h2>
          {barras.map(([nombre, n, clase]) => (
            <div key={nombre} className="barra-fila">
              <div className="barra-etq"><span>{nombre}</span><strong>{n}</strong></div>
              <div className="barra-pista"><div className={`barra ${clase}`} style={{ width: `${pct(n)}%` }} /></div>
            </div>
          ))}
          <p className="suave chico" style={{ marginTop: '1rem', marginBottom: 0 }}>
            {clientes} cliente(s) registrado(s).
          </p>
        </section>

        <section className="tarjeta">
          <h2>Cobros del mes por método <span className="suave chico">({mes.cantidad} pagos)</span></h2>
          {Object.keys(METODO).map((m) => {
            const v = mes.metodos[m] || 0;
            return (
              <div key={m} className="barra-fila">
                <div className="barra-etq"><span>{METODO[m]}</span><strong>{soles(v)}</strong></div>
                <div className="barra-pista">
                  <div className="barra barra-acento" style={{ width: `${mes.total ? (v / mes.total) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <section className="seccion" style={{ marginTop: '1.5rem' }}>
        <div className="seccion-cab">
          <h2>Mayores saldos vencidos</h2>
          <Link className="enlace-cliente" to="/prestamos?estado=vencido">Ver todos los vencidos →</Link>
        </div>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead><tr><th>Cliente</th><th>Préstamo</th><th>Cuotas vencidas</th><th>Saldo vencido</th></tr></thead>
            <tbody>
              {top.length === 0 && <tr><td colSpan="4" className="tabla-vacia">No hay préstamos vencidos.</td></tr>}
              {top.map((t) => (
                <tr key={t.prestamo_id}>
                  <td>{t.cliente}</td>
                  <td><Link className="enlace-cliente" to={`/prestamos/${t.prestamo_id}`}>{t.codigo}</Link></td>
                  <td>{t.cuotas_vencidas}</td>
                  <td className="txt-error">{soles(t.saldo_vencido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}