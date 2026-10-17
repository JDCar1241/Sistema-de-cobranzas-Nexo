import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { soles, fecha, fechaHora } from '../lib/fmt';

const MEDIOS = [
  ['whatsapp', 'WhatsApp'], ['llamada', 'Llamada'], ['sms', 'SMS'],
  ['correo', 'Correo'], ['presencial', 'Presencial'],
];

function enlaceWhatsapp(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (d.length < 9) return null;
  return `https://wa.me/${d.length === 9 ? '51' + d : d}`;
}

export default function Cobranza() {
  const [q, setQ] = useState('');
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);       // prestamo_id con formulario abierto
  const [medio, setMedio] = useState('whatsapp');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const { data, error: e } = await supabase
      .from('v_cobranza').select('*').order('saldo_vencido', { ascending: false }).limit(500);
    if (e) setError('No se pudo cargar la bandeja de cobranza.');
    else setFilas(data || []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrir(f) {
    setAbierto(abierto === f.prestamo_id ? null : f.prestamo_id);
    setMedio('whatsapp'); setComentario(''); setErrorForm('');
  }

  async function registrar(f) {
    setGuardando(true);
    setErrorForm('');
    const { error: e } = await supabase.from('notificaciones').insert({
      cliente_id: f.cliente_id,
      prestamo_id: f.prestamo_id,
      medio,
      comentario: comentario.trim() || null,
    });
    setGuardando(false);
    if (e) return setErrorForm('No se pudo registrar el contacto.');
    setAbierto(null);
    cargar();
  }

  const texto = q.trim().toLowerCase();
  const visibles = texto
    ? filas.filter((f) => `${f.cliente} ${f.codigo}`.toLowerCase().includes(texto))
    : filas;
  const totalVencido = filas.reduce((s, f) => s + Number(f.saldo_vencido), 0);

  return (
    <div className="pagina pagina-ancha">
      <div className="cabecera-pagina">
        <div>
          <h1>Por cobrar</h1>
          <p className="suave">Préstamos vencidos. Contacta al cliente y registra aquí el contacto.</p>
        </div>
      </div>

      <div className="resumen resumen-3">
        <div className="resumen-item"><span className="suave chico">Préstamos vencidos</span><strong>{filas.length}</strong></div>
        <div className="resumen-item"><span className="suave chico">Saldo vencido total</span><strong className="txt-error">{soles(totalVencido)}</strong></div>
        <div className="resumen-item">
          <span className="suave chico">Sin contactar nunca</span>
          <strong>{filas.filter((f) => !f.ultima_notificacion).length}</strong>
        </div>
      </div>

      <input className="buscador" type="search" placeholder="Buscar por cliente o código…"
        value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />

      {error && <div className="alerta alerta-error" role="alert">{error}</div>}

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr><th>Cliente</th><th>Préstamo</th><th>Vencido</th><th>Contacto</th><th>Último contacto</th><th></th></tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan="6" className="tabla-vacia">Cargando…</td></tr>}
            {!cargando && visibles.length === 0 && (
              <tr><td colSpan="6" className="tabla-vacia">
                {filas.length === 0 ? 'No hay préstamos vencidos. 🎉' : 'Sin coincidencias.'}
              </td></tr>
            )}
            {!cargando && visibles.map((f) => {
              const wa = enlaceWhatsapp(f.telefono);
              return (
                <>
                  <tr key={f.prestamo_id}>
                    <td>
                      <Link className="enlace-cliente" to={`/clientes/${f.cliente_id}`}><strong>{f.cliente}</strong></Link>
                    </td>
                    <td>
                      <Link className="enlace-cliente" to={`/prestamos/${f.prestamo_id}`}>{f.codigo}</Link>
                      <div className="suave chico">desde {fecha(f.primer_vencimiento_pendiente)}</div>
                    </td>
                    <td>
                      <strong className="txt-error">{soles(f.saldo_vencido)}</strong>
                      <div className="suave chico">{f.cuotas_vencidas} cuota(s) · saldo total {soles(f.saldo_pendiente)}</div>
                    </td>
                    <td>
                      {f.telefono
                        ? (wa ? <a className="enlace-cliente" href={wa} target="_blank" rel="noreferrer">{f.telefono}</a> : f.telefono)
                        : <span className="suave">Sin teléfono</span>}
                      {f.correo && <div className="suave chico">{f.correo}</div>}
                      {f.direccion && <div className="suave chico">{f.direccion}</div>}
                    </td>
                    <td>{f.ultima_notificacion ? fechaHora(f.ultima_notificacion) : <span className="suave">Nunca</span>}</td>
                    <td>
                      <button className="btn btn-sec btn-auto btn-chico" onClick={() => abrir(f)}>
                        {abierto === f.prestamo_id ? 'Cerrar' : 'Registrar contacto'}
                      </button>
                    </td>
                  </tr>
                  {abierto === f.prestamo_id && (
                    <tr key={`${f.prestamo_id}-form`} className="fila-form">
                      <td colSpan="6">
                        <div className="grid-2">
                          <div className="campo">
                            <label htmlFor={`m${f.prestamo_id}`}>Medio</label>
                            <select id={`m${f.prestamo_id}`} value={medio} onChange={(e) => setMedio(e.target.value)}>
                              {MEDIOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                            </select>
                          </div>
                          <div className="campo">
                            <label htmlFor={`c${f.prestamo_id}`}>Comentario (opcional)</label>
                            <input id={`c${f.prestamo_id}`} value={comentario}
                              placeholder="Ej. Prometió pagar el viernes"
                              onChange={(e) => setComentario(e.target.value)} />
                          </div>
                        </div>
                        {errorForm && <div className="alerta alerta-error" role="alert">{errorForm}</div>}
                        <button className="btn btn-auto btn-chico" disabled={guardando} onClick={() => registrar(f)}>
                          {guardando ? 'Guardando…' : 'Guardar contacto'}
                        </button>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}