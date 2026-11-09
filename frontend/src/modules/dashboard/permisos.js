// Espejo de la matriz del backend, SOLO para decidir qué bloques pedir y mostrar (ver docs/dashboard.md).
// La seguridad real está en el servidor: aunque alguien altere esto, la API responde 403 y no entrega datos.
export const PERMISOS_VENTAS = ['REP_VER_DASHBOARD', 'DASH_VER_MIS_VENTAS'];
export const PERMISOS_TOP = ['DASH_VER_TOP_PRODUCTOS'];
export const PERMISOS_ALERTAS = [
  'INV_VER_STOCK', 'REP_VER_DASHBOARD', 'POS_ANULAR_VENTA', 'CAJA_VER_CUADRES',
  'CAJA_CERRAR_TURNO', 'COM_VER_CXP', 'POS_VER_COLA_PREPARACION', 'RRHH_VER_PLANILLA',
];
