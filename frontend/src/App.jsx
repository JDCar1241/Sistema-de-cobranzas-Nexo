import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Inicio from './pages/Inicio.jsx';
import Pronto from './pages/Pronto.jsx';
import ClientesLista from './pages/ClientesLista.jsx';
import ClienteNuevo from './pages/ClienteNuevo.jsx';
import ClienteDetalle from './pages/ClienteDetalle.jsx';
import PrestamosLista from './pages/PrestamosLista.jsx';
import PrestamoNuevo from './pages/PrestamoNuevo.jsx';
import PrestamoDetalle from './pages/PrestamoDetalle.jsx';
import Pagos from './pages/Pagos.jsx';
import Constancia from './pages/Constancia.jsx';
import Cobranza from './pages/Cobranza.jsx';
import Indicadores from './pages/Indicadores.jsx';
import Reportes from './pages/Reportes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import { RUTAS } from './config/rutas.js';

// Pantallas ya construidas. Las que falten siguen como "Pronto".
const PANTALLAS = {
  'clientes': ClientesLista,
  'clientes/nuevo': ClienteNuevo,
  'prestamos': PrestamosLista,
  'prestamos/nuevo': PrestamoNuevo,
  'pagos': Pagos,
  'cobranza': Cobranza,
  'indicadores': Indicadores,
  'reportes': Reportes,
  'usuarios': Usuarios,
};

const TODOS = ['administrador', 'asesor', 'recepcionista', 'cobranzas', 'gerente'];
const VEN_PAGOS = ['administrador', 'cobranzas', 'gerente'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Inicio />} />

        {RUTAS.map((r) => {
          const Pantalla = PANTALLAS[r.path];
          return (
            <Route
              key={r.path}
              path={r.path}
              element={
                <PrivateRoute roles={r.roles}>
                  {Pantalla ? <Pantalla /> : <Pronto titulo={r.titulo} hu={r.hu} />}
                </PrivateRoute>
              }
            />
          );
        })}

        <Route path="clientes/:id" element={<PrivateRoute roles={TODOS}><ClienteDetalle /></PrivateRoute>} />
        <Route path="prestamos/:id" element={<PrivateRoute roles={TODOS}><PrestamoDetalle /></PrivateRoute>} />
        <Route path="pagos/:id/constancia" element={<PrivateRoute roles={VEN_PAGOS}><Constancia /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}