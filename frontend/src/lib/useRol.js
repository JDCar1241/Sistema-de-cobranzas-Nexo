import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useRol() {
  const [rol, setRol] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
      if (!cancelado) setRol(data?.rol ?? null);
    })();
    return () => { cancelado = true; };
  }, []);

  return rol;
}