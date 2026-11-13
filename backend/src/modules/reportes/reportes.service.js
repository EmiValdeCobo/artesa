import * as repo from './reportes.repository.js';

// Los reportes son de solo lectura: el service delega al repository (la lógica vive en las vistas SQL).
export const ventasDiarias = (filtros, userId) => repo.ventasDiarias(userId, filtros);
export const topProductos = (filtros, userId) => repo.topProductos(userId, filtros);
export const alertasStock = (filtros, userId) => repo.alertasStock(userId, filtros);
export const margenProductos = () => repo.margenProductos();
export const cuadreTurnos = (filtros, userId) => repo.cuadreTurnos(userId, filtros);
export const cuentasPorPagar = (filtros, userId) => repo.cuentasPorPagar(userId, filtros);
export const ventasPorMetodoPago = (filtros, userId) => repo.ventasPorMetodoPago(userId, filtros);
