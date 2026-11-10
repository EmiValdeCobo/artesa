import { LayoutDashboard, ShoppingBag, ChefHat, Wallet, Boxes, Truck, Users, BarChart3, ShieldCheck, Store, Settings, ScrollText } from 'lucide-react';

// Menú lateral: cada ítem se muestra solo si el usuario tiene el permiso indicado
export const menu = [
  { ruta: '/', texto: 'Inicio', permiso: null, icono: LayoutDashboard, end: true },
  { seccion: 'Operación', items: [
    { ruta: '/pos', texto: 'Punto de venta', permiso: 'POS_COBRAR', icono: ShoppingBag },
    { ruta: '/preparacion', texto: 'Preparación', permiso: 'POS_VER_COLA_PREPARACION', icono: ChefHat },
    { ruta: '/caja', texto: 'Caja y turnos', permiso: 'CAJA_ABRIR_TURNO', icono: Wallet },
    { id: 'inventario', texto: 'Inventario', icono: Boxes, hijos: [
      { ruta: '/inventario', texto: 'Existencias', permiso: 'INV_VER_STOCK', end: true },
      { ruta: '/inventario/kardex', texto: 'Kárdex', permiso: 'INV_VER_STOCK' },
    ]},
    { id: 'compras', texto: 'Compras', icono: Truck, hijos: [
      { ruta: '/compras', texto: 'Compras', permiso: 'COM_VER_CXP', end: true },
      { ruta: '/compras/proveedores', texto: 'Proveedores', permiso: 'COM_GESTIONAR_PROVEEDORES' },
      { ruta: '/compras/cuentas-por-pagar', texto: 'Cuentas por pagar', permiso: 'COM_VER_CXP' },
      { ruta: '/compras/gastos', texto: 'Compras tipo gasto', permiso: 'COM_REGISTRAR_COMPRA' },
    ]},
  ]},
  { seccion: 'Gestión', items: [
    { id: 'rrhh', texto: 'RR. HH.', icono: Users, hijos: [
      { ruta: '/rrhh/empleados', texto: 'Empleados', permiso: 'RRHH_GESTIONAR_EMPLEADOS' },
      { ruta: '/rrhh/puestos', texto: 'Puestos', permiso: 'RRHH_GESTIONAR_EMPLEADOS' },
      { ruta: '/rrhh', texto: 'Planilla', permiso: 'RRHH_VER_PLANILLA', end: true },
    ]},
    { ruta: '/reportes', texto: 'Reportes', permiso: 'REP_VER_DASHBOARD', icono: BarChart3 },
  ]},
  { seccion: 'Administración', items: [
    { ruta: '/empresa/sucursales', texto: 'Sucursales', permiso: 'EMP_GESTIONAR_SUCURSALES', icono: Store },
    { ruta: '/empresa/parametros', texto: 'Parámetros', permiso: 'EMP_EDITAR_PARAMETROS', icono: Settings },
    { ruta: '/seguridad/bitacora', texto: 'Bitácora', permiso: 'SEG_VER_BITACORA', icono: ScrollText },
    { id: 'seguridad', texto: 'Usuarios y roles', icono: ShieldCheck, hijos: [
      { ruta: '/seguridad', texto: 'Roles', permiso: 'SEG_GESTIONAR_ROLES', end: true },
      { ruta: '/seguridad/usuarios', texto: 'Usuarios', permiso: 'SEG_GESTIONAR_USUARIOS' },
    ]},
  ]},
];

// Una ruta con `end` solo coincide exacta; sin `end` también coincide con sus rutas anidadas
export const esRutaActiva = (ruta, actual, end) => (end ? actual === ruta : actual === ruta || actual.startsWith(`${ruta}/`));

export function grupoDeRuta(items, actual) {
  const grupos = items.flatMap((e) => (e.items ? e.items : [e])).filter((e) => e.hijos);
  return grupos.find((g) => g.hijos.some((h) => esRutaActiva(h.ruta, actual, h.end)))?.id ?? null;
}

export function filtrarMenu(definicion, tiene) {
  return definicion.reduce((resultado, entrada) => {
    if (entrada.items) {
      const items = filtrarMenu(entrada.items, tiene);
      if (items.length) resultado.push({ ...entrada, items });
    } else if (entrada.hijos) {
      const hijos = filtrarMenu(entrada.hijos, tiene);
      if (hijos.length) resultado.push({ ...entrada, hijos });
    } else if (!entrada.permiso || tiene(entrada.permiso)) resultado.push(entrada);
    return resultado;
  }, []);
}