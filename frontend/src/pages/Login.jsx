import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { perfil, cargando, aviso, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!cargando && perfil) return <Navigate to="/" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña');
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
    <div className="login">
      <form className="login-caja" onSubmit={enviar} noValidate>
        <div className="login-marca">
          <strong>Nexo</strong>
          <span>Cobranzas y préstamos</span>
        </div>

        <label htmlFor="email">Correo</label>
        <input id="email" type="email" autoComplete="username" value={email}
               onChange={(e) => setEmail(e.target.value)} autoFocus />

        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" value={password}
               onChange={(e) => setPassword(e.target.value)} />

        {mensaje && <p className="error" role="alert">{mensaje}</p>}

        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
