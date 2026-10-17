// Prueba el token sin necesidad de login:  npm run probar:dni 12345678
import { consultarDni, consultarRuc } from '../services/consultaDocumento.js';

const [tipo, numero] = process.argv.slice(2);
try {
  const r = tipo === 'ruc' ? await consultarRuc(numero) : await consultarDni(numero);
  console.log('OK:', r);
} catch (e) {
  console.error('ERROR:', e.status, e.message);
  process.exit(1);
}