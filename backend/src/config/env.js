import 'dotenv/config';

const requeridas = ['APIPERU_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'FRONTEND_URL'];
const faltantes = requeridas.filter((k) => !process.env[k]);
if (faltantes.length) {
  console.error(`Faltan variables en backend/.env: ${faltantes.join(', ')}`);
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  apiperuToken: process.env.APIPERU_TOKEN,
  supabaseUrl: process.env.SUPABASE_URL.replace(/\/+$/, ''),
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  frontendUrls: process.env.FRONTEND_URL.split(',').map((s) => s.trim().replace(/\/+$/, '')),
};