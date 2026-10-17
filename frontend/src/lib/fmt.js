export const soles = (n) =>
  'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fecha = (f) => (f ? String(f).slice(0, 10).split('-').reverse().join('/') : '—');

export const fechaHora = (f) =>
  f ? new Date(f).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }) : '—';

export const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

export const METODO = { tarjeta: 'Tarjeta', yape: 'Yape', efectivo: 'Efectivo' };

export function descargarCsv(nombre, cabecera, filas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const texto = [cabecera, ...filas].map((f) => f.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}