import { api } from '../../api/client.js';
import { listarTodasLasPaginas } from './paginacionApi.js';
import { obtenerTodasLasPaginas } from '../../api/paginacion.js';

export const listarProveedores = (activo = true, tipo) => api.get(`/compras/proveedores?activo=${activo}${tipo ? `&tipo=${tipo}` : ''}`);
export const crearProveedor = (datos) => api.post('/compras/proveedores', datos);
export const actualizarProveedor = (id, datos) => api.put(`/compras/proveedores/${id}`, datos);
export const desactivarProveedor = (id) => api.delete(`/compras/proveedores/${id}`);
export const registrarCompra = (datos) => api.post('/compras', datos);
export const listarCuentasPorPagar = (filtros = {}) => {
  const query = new URLSearchParams(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null)));
  return api.get(`/compras/cuentas-por-pagar${query.size ? `?${query}` : ''}`);
};
// Todas las páginas (el backend pagina obligatoriamente a 50 por defecto, 100 máx.).
export const listarTodasLasCuentasPorPagar = async (filtros = {}) => (
  await obtenerTodasLasPaginas('/compras/cuentas-por-pagar', { params: filtros })
).filas;
export const listarGastos = async (filtros = {}) => {
  return listarTodasLasPaginas(
    (paginacion) => listarCuentasPorPagar({ ...filtros, ...paginacion, tipoCosto: 'GASTO' }),
  );
};
export const obtenerFactura = (idCompra) => api.get(`/compras/facturas/${idCompra}`);
export const eliminarFactura = (idCompra) => api.delete(`/compras/facturas/${idCompra}`);
export const registrarPago = (idCompra, datos) => api.post(`/compras/${idCompra}/pagos`, datos);
export const listarInsumosCompra = () => api.get('/inventario/insumos');
