// ÚNICO archivo que conoce al proveedor (apiperu.dev).
// Para cambiar de proveedor solo se modifica este archivo.
import { env } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';

const BASE = 'https://apiperu.dev/api';

async function llamar(ruta, cuerpo) {
  let resp;
  try {
    resp = await fetch(`${BASE}/${ruta}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.apiperuToken}`,
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(502, 'No se pudo contactar al servicio de consulta. Ingresa los datos manualmente.');
  }

  if (resp.status === 401 || resp.status === 403) {
    console.error('[apiperu] Token rechazado (revisa APIPERU_TOKEN o tu plan)');
    throw new HttpError(502, 'El servicio de consulta no está disponible. Ingresa los datos manualmente.');
  }
  if (resp.status === 429) {
    throw new HttpError(429, 'Se alcanzó el límite de consultas. Intenta más tarde o ingresa los datos manualmente.');
  }

  const json = await resp.json().catch(() => null);
  if (!json?.success || !json?.data) {
    throw new HttpError(404, 'No se encontraron datos. Puedes ingresarlos manualmente.');
  }
  return json.data;
}

export async function consultarDni(dni) {
  const d = await llamar('dni', { dni });
  return {
    dni,
    nombres: d.nombres ?? '',
    apellidos: [d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' '),
  };
}

// OJO: el endpoint /api/ruc y sus campos hay que confirmarlos con docs.apiperu.dev
// (se ve en la prueba: npm run probar:ruc 20XXXXXXXXX)
export async function consultarRuc(ruc) {
  const d = await llamar('ruc', { ruc });
  return {
    ruc,
    razonSocial: d.nombre_o_razon_social ?? d.razon_social ?? '',
    estado: d.estado ?? null,
    condicion: d.condicion ?? null,
    direccion: d.direccion_completa ?? d.direccion ?? null,
  };
}