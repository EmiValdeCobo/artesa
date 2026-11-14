import { api } from './client.js';

export const preparacionApi = {
  /**
   * Obtiene la cola de órdenes activas (ABIERTA, EN_PREPARACION, LISTA).
   * @param {{ idSucursal?: number }} filtros
   */
  listarCola: (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.idSucursal) params.append('idSucursal', filtros.idSucursal);
    const q = params.toString();
    return api.get(`/preparacion/cola${q ? `?${q}` : ''}`);
  },

  /**
   * Avanza el estado de una orden: ABIERTA→EN_PREPARACION→LISTA→ENTREGADA.
   * @param {number} idOrden
   * @param {'EN_PREPARACION'|'LISTA'|'ENTREGADA'} estado
   */
  cambiarEstado: (idOrden, estado) =>
    api.patch(`/preparacion/ordenes/${idOrden}/estado`, { estado }),
};
