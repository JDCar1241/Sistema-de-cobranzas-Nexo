import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRol } from '../lib/useRol';

const EDITAN = ['administrador', 'asesor', 'recepcionista'];
const VEN_PAGOS = ['administrador', 'gerente', 'cobranzas'];

const soles = (n) =>
  'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (f) => (f ? f.split('-').reverse().join('/') : '—');
const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const METODO = { tarjeta: 'Tarjeta', yape: 'Yape', efectivo: 'Efectivo' };

export default function ClienteDetalle() {
  const { id } = useParams();
  const rol = useRol();

  const [cliente, setCliente] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [cuotas, setCuotas] = useState({});
  const [pagos, setPagos] = useState([]);
  const [tope, setTope] = useState(10000);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [editando, setEditando] = useState(false);
  const [contacto, setContacto] = useState({ telefono: '', correo: '', direccion: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data: c, error: eC } = await supabase
        .from('clientes')
        .select('*, representantes(dni, nombres, apellidos)')
        .eq('id', id)
        .single();
      if (eC) throw eC;
      setCliente(c);

      const { data: cfg } = await supabase
        .from('configuracion').select('valor').eq('clave', 'tope_capital_cliente').single();
      if (cfg) setTope(Number(cfg.valor));

      const { data: ps, error: eP } = await supabase
        .from('v_prestamos')
        .select('*')
        .eq('cliente_id', id)
        .order('fecha_otorgamiento', { ascending: false });
      if (eP) throw eP;
      setPrestamos(ps);

      const ids = ps.map((p) => p.id);
      if (ids.length) {
        const { data: cs } = await supabase
          .from('cuotas').select('*').in('prestamo_id', ids).order('numero');
        const porPrestamo = {};
        (cs || []).forEach((q) => { (porPrestamo[q.prestamo_id] ||= []).push(q); });
        setCuotas(porPrestamo);

        const { data: pg } = await supabase
          .from('pagos')
          .select('id, codigo, importe, fecha_pago, metodo, saldo_prestamo, prestamos(codigo), cuotas(numero)')
          .in('prestamo_id', ids)
          .order('created_at', { ascending: false });
        setPagos(pg || []);
      } else {
        setCuotas({});
        setPagos([]);
      }
    } catch (e) {
      setError(e.code === 'PGRST116' ? 'No se encontró el cliente.' : 'No se pudo cargar la información del cliente.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirEdicion() {
    setContacto({
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || '',
    });
    setErrorEdicion('');
    setEditando(true);
  }

  async function guardarContacto(e) {
    e.preventDefault();
    setErrorEdicion('');
    if (contacto.correo && !/^\S+@\S+\.\S+$/.test(contacto.correo)) {
      return setErrorEdicion('El correo no es válido.');
    }
    setGuardando(true);
    const { error: eU } = await supabase
      .from('clientes')
      .update({
        telefono: contacto.telefono.trim() || null,
        correo: contacto.correo.trim() || null,
        direccion: contacto.direccion.trim() || null,
      })
      .eq('id', id);
    setGuardando(false);
    if (eU) return setErrorEdicion('No se pudo guardar el contacto.');
    setEditando(false);
    cargar();
  }

  if (cargando && !cliente) return <div className="estado-pantalla">Cargando…</div>;
  if (error) {
    return (
      <div className="pagina">
        <div className="alerta alerta-error" role="alert">{error}</div>
        <Link className="btn btn-sec btn-auto" to="/clientes">Volver a clientes</Link>
      </div>
    );
  }
  if (!cliente) return null;

  const esEmpresa = cliente.tipo === 'juridica';
  const activos = prestamos.filter((p) => p.estado === 'activo');
  const capitalActivo = activos.reduce((s, p) => s + Number(p.monto_capital), 0);
  const saldoTotal = activos.reduce((s, p) => s + Number(p.saldo_pendiente), 0);
  const disponible = Math.max(tope - capitalActivo, 0);
  const verPagos = VEN_PAGOS.includes(rol);
  const puedeEditar = EDITAN.includes(rol);
  const hoy = hoyLima();

  return (
    <div className="pagina pagina-ancha">
      <p className="migas"><Link to="/clientes">← Clientes</Link></p>

      <div className="cabecera-pagina">
        <div>
          <h1>{cliente.nombre_mostrar}</h1>
          <p className="suave">
            <span className={`badge ${esEmpresa ? 'badge-empresa' : 'badge-natural'}`}>
              {esEmpresa ? 'Empresa' : 'Persona natural'}
            </span>{' '}
            {esEmpresa ? `RUC ${cliente.ruc}` : `DNI ${cliente.dni}`}
          </p>
        </div>
        {puedeEditar && (
          <Link className="btn btn-auto" to="/prestamos/nuevo" state={{ clienteId: cliente.id }}>
            Nuevo préstamo
          </Link>
        )}
      </div>

      <div className="resumen">
        <div className="resumen-item">
          <span className="suave chico">Capital activo</span>
          <strong>{soles(capitalActivo)}</strong>
        </div>
        <div className="resumen-item">
          <span className="suave chico">Cupo disponible (tope {soles(tope)})</span>
          <strong>{soles(disponible)}</strong>
        </div>
        <div className="resumen-item">
          <span className="suave chico">Saldo por pagar</span>
          <strong>{soles(saldoTotal)}</strong>
        </div>
        <div className="resumen-item">
          <span className="suave chico">Préstamos</span>
          <strong>{prestamos.length}</strong>
        </div>
      </div>

      <section className="tarjeta seccion">
        <div className="seccion-cab">
          <h2>Datos del cliente</h2>
          {puedeEditar && !editando && (
            <button className="btn btn-sec btn-auto btn-chico" onClick={abrirEdicion}>Editar contacto</button>
          )}
        </div>

        {esEmpresa && cliente.representantes && (
          <dl className="datos">
            <div>
              <dt>Representante legal</dt>
              <dd>{cliente.representantes.apellidos} {cliente.representantes.nombres}</dd>
            </div>
            <div>
              <dt>DNI del representante</dt>
              <dd>{cliente.representantes.dni}</dd>
            </div>
          </dl>
        )}

        {!editando ? (
          <dl className="datos">
            <div><dt>Teléfono</dt><dd>{cliente.telefono || '—'}</dd></div>
            <div><dt>Correo</dt><dd>{cliente.correo || '—'}</dd></div>
            <div><dt>Dirección</dt><dd>{cliente.direccion || '—'}</dd></div>
            <div><dt>Registrado</dt><dd>{fecha(cliente.created_at?.slice(0, 10))}</dd></div>
          </dl>
        ) : (
          <form onSubmit={guardarContacto} noValidate>
            <div className="grid-2">
              <div className="campo">
                <label htmlFor="e_tel">Teléfono</label>
                <input id="e_tel" type="tel" value={contacto.telefono}
                  onChange={(e) => setContacto({ ...contacto, telefono: e.target.value })} />
              </div>
              <div className="campo">
                <label htmlFor="e_cor">Correo</label>
                <input id="e_cor" type="email" value={contacto.correo}
                  onChange={(e) => setContacto({ ...contacto, correo: e.target.value })} />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="e_dir">Dirección</label>
              <input id="e_dir" value={contacto.direccion}
                onChange={(e) => setContacto({ ...contacto, direccion: e.target.value })} />
            </div>
            {errorEdicion && <div className="alerta alerta-error" role="alert">{errorEdicion}</div>}
            <div className="acciones">
              <button className="btn btn-auto" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
              <button type="button" className="btn btn-sec btn-auto" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </section>

      <section className="seccion">
        <h2>Préstamos</h2>
        {prestamos.length === 0 ? (
          <div className="tarjeta suave">Este cliente aún no tiene préstamos.</div>
        ) : (
          prestamos.map((p) => (
            <details key={p.id} className="tarjeta prestamo-det">
              <summary>
                <span className="prestamo-cod">{p.codigo}</span>
                <span className={`badge badge-${p.estado_actual}`}>{p.estado_actual}</span>
                <span>Capital {soles(p.monto_capital)}</span>
                <span>Saldo {soles(p.saldo_pendiente)}</span>
                <span className="suave">{fecha(p.fecha_otorgamiento)} · {p.plazo_meses} meses</span>
              </summary>

              <div className="tabla-wrap tabla-interna">
                <table className="tabla">
                  <thead>
                    <tr><th>Cuota</th><th>Vence</th><th>Monto</th><th>Pagado</th><th>Saldo</th></tr>
                  </thead>
                  <tbody>
                    {(cuotas[p.id] || []).map((q) => {
                      const vencida = Number(q.saldo) > 0 && q.fecha_vencimiento < hoy;
                      return (
                        <tr key={q.id}>
                          <td>{q.numero}</td>
                          <td className={vencida ? 'txt-error' : ''}>
                            {fecha(q.fecha_vencimiento)}{vencida && ' (vencida)'}
                          </td>
                          <td>{soles(q.monto)}</td>
                          <td>{soles(q.monto_pagado)}</td>
                          <td>{Number(q.saldo) === 0 ? <span className="txt-ok">Pagada</span> : soles(q.saldo)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))
        )}
      </section>

      {verPagos && (
        <section className="seccion">
          <h2>Pagos</h2>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th><th>Fecha</th><th>Préstamo</th><th>Cuota</th>
                  <th>Método</th><th>Importe</th><th>Saldo préstamo</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 && (
                  <tr><td colSpan="7" className="tabla-vacia">Aún no hay pagos registrados.</td></tr>
                )}
                {pagos.map((g) => (
                  <tr key={g.id}>
                    <td>{g.codigo}</td>
                    <td>{fecha(g.fecha_pago)}</td>
                    <td>{g.prestamos?.codigo}</td>
                    <td>{g.cuotas?.numero}</td>
                    <td>{METODO[g.metodo] || g.metodo}</td>
                    <td>{soles(g.importe)}</td>
                    <td>{soles(g.saldo_prestamo)}</td>
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