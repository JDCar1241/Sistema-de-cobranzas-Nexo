import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { soles, fecha, fechaHora, METODO } from '../lib/fmt';

export default function Constancia() {
  const { id } = useParams();
  const [g, setG] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('pagos')
      .select(`codigo, importe, fecha_pago, metodo, saldo_cuota, saldo_prestamo, created_at,
        cuotas(numero, monto, fecha_vencimiento),
        prestamos(codigo, total_a_pagar, plazo_meses, clientes(nombre_mostrar, tipo, dni, ruc)),
        registrador:perfiles!registrado_por(nombre)`)
      .eq('id', id).single()
      .then(({ data, error: e }) => (e ? setError('No se encontró el pago.') : setG(data)));
  }, [id]);

  if (error) {
    return (
      <div className="pagina">
        <div className="alerta alerta-error" role="alert">{error}</div>
        <Link className="btn btn-sec btn-auto" to="/pagos">Volver a pagos</Link>
      </div>
    );
  }
  if (!g) return <div className="estado-pantalla">Cargando…</div>;

  const cli = g.prestamos?.clientes;

  return (
    <div className="pagina">
      <div className="acciones no-imprimir" style={{ marginTop: 0, marginBottom: '1rem' }}>
        <button className="btn btn-auto" onClick={() => window.print()}>Imprimir constancia</button>
        <Link className="btn btn-sec btn-auto" to="/pagos">Volver</Link>
      </div>

      <article className="constancia">
        <header className="constancia-cab">
          <div>
            <strong className="constancia-marca">Nexo</strong>
            <div className="suave chico">Cobranzas y préstamos</div>
          </div>
          <div className="constancia-num">
            <span className="suave chico">Constancia de pago</span>
            <strong>{g.codigo}</strong>
          </div>
        </header>

        <dl className="constancia-datos">
          <div><dt>Cliente</dt><dd>{cli?.nombre_mostrar}</dd></div>
          <div><dt>Documento</dt><dd>{cli?.tipo === 'juridica' ? `RUC ${cli?.ruc}` : `DNI ${cli?.dni}`}</dd></div>
          <div><dt>Préstamo</dt><dd>{g.prestamos?.codigo}</dd></div>
          <div><dt>Cuota</dt><dd>N.º {g.cuotas?.numero} de {g.prestamos?.plazo_meses} (vence {fecha(g.cuotas?.fecha_vencimiento)})</dd></div>
          <div><dt>Fecha de pago</dt><dd>{fecha(g.fecha_pago)}</dd></div>
          <div><dt>Método</dt><dd>{METODO[g.metodo]}</dd></div>
        </dl>

        <div className="constancia-importe">
          <span>Importe pagado</span>
          <strong>{soles(g.importe)}</strong>
        </div>

        <dl className="constancia-datos">
          <div><dt>Saldo de la cuota</dt><dd>{soles(g.saldo_cuota)}</dd></div>
          <div><dt>Saldo del préstamo</dt><dd>{soles(g.saldo_prestamo)}</dd></div>
        </dl>

        <footer className="constancia-pie suave chico">
          Registrado el {fechaHora(g.created_at)}{g.registrador?.nombre ? ` por ${g.registrador.nombre}` : ''}.
          Documento sin valor tributario.
        </footer>
      </article>
    </div>
  );
}