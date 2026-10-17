import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function PrivateRoute({ roles, children }) {
  const { perfil, cargando } = useAuth();

  if (cargando) return <p className="estado-pantalla" role="status">Cargando…</p>;
  if (!perfil) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(perfil.rol)) {
    return (
      <div className="pagina">
        <h1>Sin permiso</h1>
        <p className="suave">Tu rol no tiene acceso a esta pantalla.</p>
      </div>
    );
  }
  return children;
}
