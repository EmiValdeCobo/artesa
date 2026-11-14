import { api } from '../../api/client.js';

export const listarProveedores = (activo = true) => api.get(`/compras/proveedores?activo=${activo}`);
export const crearProveedor = (datos) => api.post('/compras/proveedores', datos);
export const actualizarProveedor = (id, datos) => api.put(`/compras/proveedores/${id}`, datos);
export const desactivarProveedor = (id) => api.delete(`/compras/proveedores/${id}`);
export const registrarCompra = (datos) => api.post('/compras', datos);
export const listarCuentasPorPagar = (filtros = {}) => {
  const query = new URLSearchParams(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null)));
  return api.get(`/compras/cuentas-por-pagar${query.size ? `?${query}` : ''}`);
};
export const registrarPago = (idCompra, datos) => api.post(`/compras/${idCompra}/pagos`, datos);
export const listarInsumosCompra = () => api.get('/inventario/insumos');
