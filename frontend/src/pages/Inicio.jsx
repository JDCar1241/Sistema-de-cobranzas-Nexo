import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RUTAS, ETIQUETA_ROL } from '../config/rutas';
import { soles, fecha, hoyLima } from '../lib/fmt';

const PATHS = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  userPlus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  plusCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 8v8M8 12h8',
  card: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  bars: 'M18 20V10M12 20V4M6 20v-6',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  arrow: 'M5 12h14M12 5l7 7',
};

function Icono({ n, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[n]} />
    </svg>
  );
}

const ICONO_RUTA = {
  'clientes': 'users',
  'clientes/nuevo': 'userPlus',
  'prestamos': 'file',
  'prestamos/nuevo': 'plusCircle',
  'pagos': 'card',
  'cobranza': 'phone',
  'indicadores': 'bars',
  'reportes': 'trend',
  'usuarios': 'lock',
};

function saludo() {
  const h = Number(
    new Date().toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false })
  ) % 24;
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaLarga() {
  const t = new Date().toLocaleDateString('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Inicio() {
  const [perfil, setPerfil] = useState(null);
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single();
      setPerfil(data);

      // Lima es UTC-5 todo el año (sin horario de verano)
      const desdeHoy = `${hoyLima()}T00:00:00-05:00`;
      const contar = (tabla, filtro) => {
        const q = supabase.from(tabla).select('*', { count: 'exact', head: true });
        return filtro ? filtro(q) : q;
      };

      const [cHoy, pHoy, vig, ven, ultimos] = await Promise.all([
        contar('clientes', (q) => q.gte('created_at', desdeHoy)),
        contar('prestamos', (q) => q.gte('created_at', desdeHoy)),
        contar('v_prestamos', (q) => q.eq('estado_actual', 'vigente')),
        contar('v_prestamos', (q) => q.eq('estado_actual', 'vencido')),
        supabase.from('v_prestamos')
          .select('id, codigo, cliente, monto_capital, fecha_otorgamiento, estado_actual')
          .order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        clientesHoy: cHoy.count || 0,
        prestamosHoy: pHoy.count || 0,
        vigentes: vig.count || 0,
        vencidos: ven.count || 0,
      });
      setRecientes(ultimos.data || []);
    })();
  }, []);

  const rol = perfil?.rol;
  const accesos = RUTAS.filter((r) => r.roles.includes(rol));
  const nuevos = accesos.filter((r) => r.path.endsWith('/nuevo'));
  const secciones = accesos.filter((r) => !r.path.endsWith('/nuevo'));
  const destacados = nuevos.length ? nuevos : secciones.slice(0, 2);
  const primerNombre = perfil?.nombre?.split(' ')[0] || '';
  const v = (n) => (stats ? n : '…');

  const tarjetas = [
    ['Clientes nuevos hoy', v(stats?.clientesHoy), 'userPlus', 'ic-azul', ''],
    ['Préstamos de hoy', v(stats?.prestamosHoy), 'plusCircle', 'ic-verde', ''],
    ['Préstamos vigentes', v(stats?.vigentes), 'check', 'ic-ok', ''],
    ['Préstamos vencidos', v(stats?.vencidos), 'alert',
      stats?.vencidos ? 'ic-rojo' : 'ic-gris', stats?.vencidos ? 'txt-error' : ''],
  ];

  return (
    <div className="pagina inicio">
      <header className="hero">
        <div>
          <span className="hero-rol">{ETIQUETA_ROL[rol] || '\u00a0'}</span>
          <h1>{saludo()}{primerNombre && `, ${primerNombre}`}</h1>
          <p>{fechaLarga()}</p>
        </div>
        <div className="hero-acciones">
          {destacados.map((r, i) => (
            <Link key={r.path} to={`/${r.path}`} className={i === 0 ? 'hero-btn hero-btn-1' : 'hero-btn'}>
              <Icono n={ICONO_RUTA[r.path]} size={20} />
              {r.titulo}
            </Link>
          ))}
        </div>
      </header>

      <div className="stats">
        {tarjetas.map(([titulo, valor, icono, clase, txt]) => (
          <div key={titulo} className="stat">
            <span className={`stat-ic ${clase}`}><Icono n={icono} /></span>
            <div>
              <span className="suave chico">{titulo}</span>
              <strong className={txt}>{valor}</strong>
            </div>
          </div>
        ))}
      </div>

      <section className="seccion">
        <h2>Tus secciones</h2>
        <div className="atajos">
          {accesos.map((r) => (
            <Link key={r.path} to={`/${r.path}`} className="atajo">
              <span className="atajo-ic"><Icono n={ICONO_RUTA[r.path]} /></span>
              <span className="atajo-txt">
                <strong>{r.titulo}</strong>
                <span className="suave chico">{r.descripcion}</span>
              </span>
              <span className="atajo-flecha"><Icono n="arrow" size={18} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="seccion">
        <div className="seccion-cab">
          <h2>Últimos préstamos registrados</h2>
          <Link className="enlace-cliente" to="/prestamos">Ver todos →</Link>
        </div>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Código</th><th>Cliente</th><th>Otorgado</th><th>Capital</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {recientes.length === 0 && (
                <tr><td colSpan="5" className="tabla-vacia">Aún no hay préstamos registrados.</td></tr>
              )}
              {recientes.map((p) => (
                <tr key={p.id}>
                  <td><Link className="enlace-cliente" to={`/prestamos/${p.id}`}><strong>{p.codigo}</strong></Link></td>
                  <td>{p.cliente}</td>
                  <td>{fecha(p.fecha_otorgamiento)}</td>
                  <td>{soles(p.monto_capital)}</td>
                  <td><span className={`badge badge-${p.estado_actual}`}>{p.estado_actual}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}