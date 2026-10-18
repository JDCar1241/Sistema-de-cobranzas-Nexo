import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import '../styles/login.css';

const SEDES = ['Chimbote', 'Trujillo', 'Chiclayo', 'Tumbes', 'Piura'];

// Ejemplo ilustrativo del cronograma: cuotas cada 30 días.
const CRONOGRAMA = [
  { dia: 30, estado: 'Pagada', clase: 'pagada' },
  { dia: 60, estado: 'Pagada', clase: 'pagada' },
  { dia: 90, estado: 'Próxima', clase: 'proxima' },
  { dia: 120, estado: 'Pendiente', clase: 'pendiente' },
];

export default function Login() {
  const { perfil, cargando, aviso, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!cargando && perfil) return <Navigate to="/" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }
    setEnviando(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const mensaje = error || aviso;

  return (
    <div className="lg-pagina">
      <aside className="lg-marca" aria-hidden="true">
        <Logo claro tamano={40} />

        <div className="lg-mensaje">
          <h2>Cada cuota, en su fecha.</h2>
          <p>
            Registra clientes y préstamos sin confusiones y sigue el cronograma
            de pagos desde un solo lugar.
          </p>

          <ol className="lg-cronograma">
            {CRONOGRAMA.map((c) => (
              <li key={c.dia} className={`lg-cuota lg-${c.clase}`}>
                <span className="lg-punto" />
                <span className="lg-cuota-dia">Día {c.dia}</span>
                <span className="lg-cuota-estado">{c.estado}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="lg-sedes">Sedes: {SEDES.join(', ')}</p>
      </aside>

      <main className="lg-panel">
        <form className="lg-form" onSubmit={enviar} noValidate>
          <Logo className="lg-logo-movil" tamano={40} />
          <h1>Inicia sesión</h1>
          <p className="suave lg-sub">Accede con tu cuenta del personal.</p>

          <div className="campo">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <div className="lg-pass">
              <input
                id="password"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="lg-ver"
                onClick={() => setVerPassword((v) => !v)}
                aria-pressed={verPassword}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {mensaje && (
            <p className="lg-error" role="alert">
              {mensaje}
            </p>
          )}

          <button type="submit" className="btn lg-enviar" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="chico suave lg-pie">
            ¿No puedes ingresar? Pide a un administrador que revise tu cuenta.
          </p>
        </form>

      </main>
    </div>
  );
}