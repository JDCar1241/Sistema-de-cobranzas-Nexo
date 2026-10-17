export const moneda = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n) || 0);

// Las fechas de la base vienen como 'AAAA-MM-DD'; se arma sin zona horaria para no restar un día
export const fecha = (iso) => {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};