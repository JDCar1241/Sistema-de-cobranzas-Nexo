import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = aún cargando
  const [perfil, setPerfil] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const sesionLista = session !== undefined;

  // Carga el rol del usuario desde la tabla perfiles
  useEffect(() => {
    if (!sesionLista) return;
    if (!userId) {
      setPerfil(null);
      return;
    }
    let cancelado = false;
    supabase
      .from('perfiles')
      .select('nombre, rol, activo')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error || !data || !data.activo) {
          setAviso('Tu usuario no tiene acceso al sistema. Pide al administrador que lo active.');
          supabase.auth.signOut();
          return;
        }
        setPerfil({ id: userId, email: session.user.email, ...data });
      });
    return () => { cancelado = true; };
  }, [userId, sesionLista]);

  const cargando = session === undefined || (!!userId && !perfil);

  const login = async (email, password) => {
    setAviso('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        /invalid login/i.test(error.message)
          ? 'Correo o contraseña incorrectos'
          : 'No se pudo iniciar sesión. Intenta de nuevo.'
      );
    }
  };

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ perfil, cargando, aviso, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}