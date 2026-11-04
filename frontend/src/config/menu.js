import { LayoutDashboard, ShoppingBag, ChefHat, Wallet, Boxes, Truck, Users, UserRoundCog, BarChart3, ShieldCheck } from 'lucide-react';

// Menú lateral: cada ítem se muestra solo si el usuario tiene el permiso indicado
export const menu = [
  { ruta: '/', texto: 'Inicio', permiso: null, icono: LayoutDashboard, end: true },
  { seccion: 'Operación', items: [
    { ruta: '/pos', texto: 'Punto de venta', permiso: 'POS_COBRAR', icono: ShoppingBag },
    { ruta: '/preparacion', texto: 'Preparación', permiso: 'POS_VER_COLA_PREPARACION', icono: ChefHat },
    { ruta: '/caja', texto: 'Caja y turnos', permiso: 'CAJA_ABRIR_TURNO', icono: Wallet },
    { ruta: '/inventario', texto: 'Inventario', permiso: 'INV_VER_STOCK', icono: Boxes },
    { ruta: '/compras', texto: 'Compras', permiso: 'COM_VER_CXP', icono: Truck },
  ]},
  { seccion: 'Gestión', items: [
    { ruta: '/rrhh', texto: 'RR. HH. y planilla', permiso: 'RRHH_VER_PLANILLA', icono: Users },
    { ruta: '/reportes', texto: 'Reportes', permiso: 'REP_VER_DASHBOARD', icono: BarChart3 },
  ]},
  { seccion: 'Administración', items: [
    { texto: 'Usuarios y roles', icono: ShieldCheck, hijos: [
      { ruta: '/seguridad', texto: 'Roles', permiso: 'SEG_GESTIONAR_ROLES', icono: ShieldCheck, end: true },
      { ruta: '/seguridad/usuarios', texto: 'Usuarios', permiso: 'SEG_GESTIONAR_USUARIOS', icono: UserRoundCog },
    ]},
  ]},
];

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
