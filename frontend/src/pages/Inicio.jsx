import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RUTAS, ETIQUETA_ROL } from '../config/rutas';
import { soles, fecha, hoyLima } from '../lib/fmt';
import Icono, { ICONO_RUTA } from '../components/Icono.jsx';

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