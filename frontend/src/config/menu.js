import { LayoutDashboard, ShoppingBag, ChefHat, Wallet, Boxes, Truck, Users, BarChart3, ShieldCheck } from 'lucide-react';

// Menú lateral: cada ítem se muestra solo si el usuario tiene el permiso indicado
export const menu = [
  { ruta: '/', texto: 'Inicio', permiso: null, icono: LayoutDashboard },
  { ruta: '/pos', texto: 'Punto de venta', permiso: 'POS_COBRAR', icono: ShoppingBag },
  { ruta: '/preparacion', texto: 'Preparación', permiso: 'POS_VER_COLA_PREPARACION', icono: ChefHat },
  { ruta: '/caja', texto: 'Caja y turnos', permiso: 'CAJA_ABRIR_TURNO', icono: Wallet },
  { ruta: '/inventario', texto: 'Inventario', permiso: 'INV_VER_STOCK', icono: Boxes },
  { ruta: '/compras', texto: 'Compras', permiso: 'COM_VER_CXP', icono: Truck },
  { ruta: '/rrhh', texto: 'RR. HH. y planilla', permiso: 'RRHH_VER_PLANILLA', icono: Users },
  { ruta: '/reportes', texto: 'Reportes', permiso: 'REP_VER_DASHBOARD', icono: BarChart3 },
  { ruta: '/seguridad', texto: 'Usuarios y roles', permiso: 'SEG_GESTIONAR_ROLES', icono: ShieldCheck },
];
