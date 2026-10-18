import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { rutasDeMenu, ETIQUETA_ROL } from '../config/rutas.js';
import Logo from './Logo.jsx';
import Icono, { ICONO_RUTA } from './Icono.jsx';

export default function Layout() {
  const { perfil, logout } = useAuth();

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <Logo claro tamano={34} />
          <span className="marca-sub">Cobranzas y préstamos</span>
        </div>

        <nav className="menu" aria-label="Principal">
          <NavLink to="/" end>
            <Icono n="home" size={18} />
            <span>Inicio</span>
          </NavLink>
          {rutasDeMenu(perfil.rol).map((r) => (
            <NavLink key={r.path} to={`/${r.path}`}>
              <Icono n={ICONO_RUTA[r.path]} size={18} />
              <span>{r.titulo}</span>
            </NavLink>
          ))}
        </nav>

        <div className="usuario">
          <div>
            <div className="usuario-nombre">{perfil.nombre}</div>
            <div className="usuario-rol">{ETIQUETA_ROL[perfil.rol]}</div>
          </div>
          <button type="button" className="btn-texto" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}