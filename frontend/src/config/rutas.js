// Fuente única de las pantallas: de aquí salen el menú, las rutas y los permisos.
// Cuando construyamos una pantalla real, se le agrega su componente en App.jsx.
const TODOS = ['administrador', 'asesor', 'recepcionista', 'cobranzas', 'gerente'];
const REGISTRAN = ['administrador', 'asesor', 'recepcionista'];

export const RUTAS = [
  { path: 'clientes', titulo: 'Clientes', hu: 'HU02', roles: TODOS,
    descripcion: 'Buscar clientes por DNI, RUC o nombre' },
  { path: 'clientes/nuevo', titulo: 'Registrar cliente', hu: 'HU01', roles: REGISTRAN,
    descripcion: 'Dar de alta una persona o una empresa' },
  { path: 'prestamos', titulo: 'Préstamos', hu: 'HU04', roles: TODOS,
    descripcion: 'Montos, vencimientos y saldos' },
  { path: 'prestamos/nuevo', titulo: 'Registrar préstamo', hu: 'HU03', roles: REGISTRAN,
    descripcion: 'Nuevo préstamo con su cronograma de cuotas' },
  { path: 'pagos', titulo: 'Pagos', hu: 'HU07', roles: ['administrador', 'cobranzas'],
    descripcion: 'Registrar el pago de una cuota' },
  { path: 'cobranza', titulo: 'Por cobrar', hu: 'HU10', roles: ['administrador', 'cobranzas'],
    descripcion: 'Clientes con cuotas vencidas para contactar' },
  { path: 'indicadores', titulo: 'Indicadores', hu: 'HU11', roles: ['administrador', 'gerente'],
    descripcion: 'Situación general de préstamos y cobranzas' },
  { path: 'reportes', titulo: 'Reportes', hu: 'HU12', roles: ['administrador', 'gerente'],
    descripcion: 'Pagos y saldos pendientes por periodo' },
  { path: 'usuarios', titulo: 'Usuarios', hu: 'HU15', roles: ['administrador'],
    descripcion: 'Crear usuarios y asignar roles' },
];

// Rutas que aparecen en el menú (las de "nuevo" se abren desde su lista)
export const rutasDeMenu = (rol) =>
  RUTAS.filter((r) => r.roles.includes(rol) && !r.path.endsWith('/nuevo'));

export const ETIQUETA_ROL = {
  administrador: 'Administrador',
  asesor: 'Asesor',
  recepcionista: 'Recepcionista',
  cobranzas: 'Encargado de cobranzas',
  gerente: 'Gerente',
};