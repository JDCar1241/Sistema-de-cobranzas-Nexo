import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consultarDni, consultarRuc } from '../lib/api';

const VACIO = {
  tipo: 'natural',
  dni: '', nombres: '', apellidos: '',
  ruc: '', razon_social: '',
  rep_dni: '', rep_nombres: '', rep_apellidos: '',
  telefono: '', correo: '', direccion: '',
};

const soloDigitos = (v, max) => v.replace(/\D/g, '').slice(0, max);

// Aceptan varios formatos posibles de respuesta del proveedor
function leerDni(resp) {
  const d = resp?.data ?? resp ?? {};
  const paterno = d.apellido_paterno ?? d.apellidoPaterno ?? '';
  const materno = d.apellido_materno ?? d.apellidoMaterno ?? '';
  const apellidos = d.apellidos ?? [paterno, materno].filter(Boolean).join(' ');
  const nombres = d.nombres ?? '';
  if (!nombres && !apellidos) throw new Error('Sin resultados');
  return { nombres, apellidos };
}

function leerRuc(resp) {
  const d = resp?.data ?? resp ?? {};
  const razon = d.razon_social ?? d.nombre_o_razon_social ?? d.razonSocial ?? d.nombre ?? '';
  if (!razon) throw new Error('Sin resultados');
  return { razon_social: razon, direccion: d.direccion ?? d.domicilio_fiscal ?? '' };
}

// IMPORTANTE: vive FUERA de ClienteNuevo. Si se define dentro, React la recrea
// en cada tecla y el campo pierde el foco.
function Busqueda({ clave, valor, max, etiqueta, placeholder, onChange, onBuscar, buscando, aviso }) {
  return (
    <div className="campo">
      <label htmlFor={clave}>{etiqueta}</label>
      <div className="campo-doc">
        <input
          id={clave}
          inputMode="numeric"
          autoComplete="off"
          maxLength={max}
          value={valor}
          placeholder={placeholder}
          onChange={onChange}
        />
        <button
          type="button"
          className="btn btn-sec btn-auto"
          disabled={buscando === clave || valor.length < max}
          onClick={() => onBuscar(clave)}
        >
          {buscando === clave ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {aviso[clave] && <p className="ayuda ayuda-aviso">{aviso[clave]}</p>}
    </div>
  );
}

export default function ClienteNuevo() {
  const [f, setF] = useState(VACIO);
  const [buscando, setBuscando] = useState('');
  const [aviso, setAviso] = useState({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(null);

  const set = (k, max) => (e) => {
    const v = max ? soloDigitos(e.target.value, max) : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
  };

  const esEmpresa = f.tipo === 'juridica';

  async function buscar(clave) {
    setAviso((a) => ({ ...a, [clave]: '' }));
    setBuscando(clave);
    try {
      if (clave === 'dni' || clave === 'rep_dni') {
        const num = f[clave];
        if (!/^\d{8}$/.test(num)) throw new Error('El DNI debe tener 8 dígitos');
        const r = leerDni(await consultarDni(num));
        const pre = clave === 'dni' ? '' : 'rep_';
        setF((p) => ({ ...p, [`${pre}nombres`]: r.nombres, [`${pre}apellidos`]: r.apellidos }));
      } else {
        if (!/^20\d{9}$/.test(f.ruc)) throw new Error('El RUC debe tener 11 dígitos y empezar con 20');
        const r = leerRuc(await consultarRuc(f.ruc));
        setF((p) => ({
          ...p,
          razon_social: r.razon_social,
          direccion: p.direccion || r.direccion,
        }));
      }
    } catch (e) {
      const sinDatos = e.message === 'Sin resultados';
      setAviso((a) => ({
        ...a,
        [clave]: sinDatos ? 'No se encontraron datos. Escríbelos a mano.' : e.message,
      }));
    } finally {
      setBuscando('');
    }
  }

  function validar() {
    if (esEmpresa) {
      if (!/^20\d{9}$/.test(f.ruc)) return 'El RUC debe tener 11 dígitos y empezar con 20.';
      if (!f.razon_social.trim()) return 'Falta la razón social.';
      if (!/^\d{8}$/.test(f.rep_dni)) return 'El DNI del representante debe tener 8 dígitos.';
      if (!f.rep_nombres.trim() || !f.rep_apellidos.trim())
        return 'Faltan los nombres o apellidos del representante.';
    } else {
      if (!/^\d{8}$/.test(f.dni)) return 'El DNI debe tener 8 dígitos.';
      if (!f.nombres.trim() || !f.apellidos.trim()) return 'Faltan los nombres o apellidos.';
    }
    if (f.correo && !/^\S+@\S+\.\S+$/.test(f.correo)) return 'El correo no es válido.';
    return '';
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    const problema = validar();
    if (problema) return setError(problema);

    setGuardando(true);
    try {
      const contacto = {
        telefono: f.telefono.trim() || null,
        correo: f.correo.trim() || null,
        direccion: f.direccion.trim() || null,
      };
      let fila;

      if (esEmpresa) {
        // El representante es una persona con DNI único: se crea o se reutiliza
        const { data: rep, error: eRep } = await supabase
          .from('representantes')
          .upsert(
            { dni: f.rep_dni, nombres: f.rep_nombres.trim(), apellidos: f.rep_apellidos.trim() },
            { onConflict: 'dni' }
          )
          .select('id')
          .single();
        if (eRep) throw eRep;

        fila = {
          tipo: 'juridica',
          ruc: f.ruc,
          razon_social: f.razon_social.trim(),
          representante_id: rep.id,
          ...contacto,
        };
      } else {
        fila = {
          tipo: 'natural',
          dni: f.dni,
          nombres: f.nombres.trim(),
          apellidos: f.apellidos.trim(),
          ...contacto,
        };
      }

      const { data, error: eCli } = await supabase
        .from('clientes')
        .insert(fila)
        .select('id, nombre_mostrar')
        .single();
      if (eCli) throw eCli;

      setCreado(data);
    } catch (err) {
      if (err.code === '23505') {
        setError(esEmpresa ? 'Ya existe un cliente con ese RUC.' : 'Ya existe un cliente con ese DNI.');
      } else if (err.code === '42501') {
        setError('Tu rol no tiene permiso para registrar clientes.');
      } else {
        setError(err.message || 'No se pudo guardar el cliente.');
      }
    } finally {
      setGuardando(false);
    }
  }

  function otro() {
    setF(VACIO);
    setAviso({});
    setError('');
    setCreado(null);
  }

  if (creado) {
    return (
      <div className="pagina">
        <h1>Cliente registrado</h1>
        <div className="alerta alerta-ok">
          <strong>{creado.nombre_mostrar}</strong> quedó registrado correctamente.
        </div>
        <div className="acciones">
          <button className="btn btn-auto" onClick={otro}>Registrar otro cliente</button>
          <Link className="btn btn-sec btn-auto" to={`/clientes/${creado.id}`}>Ver detalle</Link>
          <Link className="btn btn-sec btn-auto" to="/clientes">Ver clientes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="cabecera-pagina">
        <div>
          <h1>Registrar cliente</h1>
          <p className="suave">Persona natural o empresa. Los datos se completan con el documento.</p>
        </div>
      </div>

      <form onSubmit={guardar} noValidate className="tarjeta">
        <div className="segmentado" role="group" aria-label="Tipo de cliente">
          <button type="button" className={!esEmpresa ? 'activo' : ''}
            onClick={() => setF((p) => ({ ...p, tipo: 'natural' }))}>Persona natural</button>
          <button type="button" className={esEmpresa ? 'activo' : ''}
            onClick={() => setF((p) => ({ ...p, tipo: 'juridica' }))}>Empresa</button>
        </div>

        {!esEmpresa ? (
          <section className="bloque">
            <h2>Datos de la persona</h2>
            <Busqueda clave="dni" valor={f.dni} max={8} etiqueta="DNI" placeholder="8 dígitos"
              onChange={set('dni', 8)} onBuscar={buscar} buscando={buscando} aviso={aviso} />
            <div className="grid-2">
              <div className="campo">
                <label htmlFor="nombres">Nombres</label>
                <input id="nombres" value={f.nombres} onChange={set('nombres')} />
              </div>
              <div className="campo">
                <label htmlFor="apellidos">Apellidos</label>
                <input id="apellidos" value={f.apellidos} onChange={set('apellidos')} />
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="bloque">
              <h2>Datos de la empresa</h2>
              <Busqueda clave="ruc" valor={f.ruc} max={11} etiqueta="RUC" placeholder="Empieza con 20"
                onChange={set('ruc', 11)} onBuscar={buscar} buscando={buscando} aviso={aviso} />
              <div className="campo">
                <label htmlFor="razon_social">Razón social</label>
                <input id="razon_social" value={f.razon_social} onChange={set('razon_social')} />
              </div>
            </section>

            <section className="bloque">
              <h2>Representante legal</h2>
              <p className="suave chico">Es una persona con su propio tope de S/ 10,000, independiente del de la empresa.</p>
              <Busqueda clave="rep_dni" valor={f.rep_dni} max={8} etiqueta="DNI del representante" placeholder="8 dígitos"
                onChange={set('rep_dni', 8)} onBuscar={buscar} buscando={buscando} aviso={aviso} />
              <div className="grid-2">
                <div className="campo">
                  <label htmlFor="rep_nombres">Nombres</label>
                  <input id="rep_nombres" value={f.rep_nombres} onChange={set('rep_nombres')} />
                </div>
                <div className="campo">
                  <label htmlFor="rep_apellidos">Apellidos</label>
                  <input id="rep_apellidos" value={f.rep_apellidos} onChange={set('rep_apellidos')} />
                </div>
              </div>
            </section>
          </>
        )}

        <section className="bloque">
          <h2>Contacto</h2>
          <div className="grid-2">
            <div className="campo">
              <label htmlFor="telefono">Teléfono</label>
              <input id="telefono" type="tel" value={f.telefono} onChange={set('telefono')} />
            </div>
            <div className="campo">
              <label htmlFor="correo">Correo</label>
              <input id="correo" type="email" value={f.correo} onChange={set('correo')} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="direccion">Dirección</label>
            <input id="direccion" value={f.direccion} onChange={set('direccion')} />
          </div>
        </section>

        {error && <div className="alerta alerta-error" role="alert">{error}</div>}

        <div className="acciones">
          <button className="btn btn-auto" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cliente'}
          </button>
          <Link className="btn btn-sec btn-auto" to="/clientes">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}