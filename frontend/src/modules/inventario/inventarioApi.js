import { api } from '../../api/client.js';

// ── Unidades de medida ────────────────────────────────────────────────────────
export const getUnidades       = ()         => api.get('/inventario/unidades-medida');
export const createUnidad      = (body)     => api.post('/inventario/unidades-medida', body);
export const updateUnidad      = (id, body) => api.put(`/inventario/unidades-medida/${id}`, body);
export const deleteUnidad      = (id)       => api.delete(`/inventario/unidades-medida/${id}`);

// ── Insumos ───────────────────────────────────────────────────────────────────
export const getInsumos        = (params)   => api.get(`/inventario/insumos${params ? `?${new URLSearchParams(params).toString()}` : ''}`);
export const createInsumo      = (body)     => api.post('/inventario/insumos', body);
export const updateInsumo      = (id, body) => api.put(`/inventario/insumos/${id}`, body);
export const cambiarEstadoInsumo = (id, activo) => api.patch(`/inventario/insumos/${id}/estado`, activo !== undefined ? { activo } : {});
export const patchInsumoEstado = cambiarEstadoInsumo;
export const deleteInsumo      = (id)       => api.delete(`/inventario/insumos/${id}`);

// ── Categorías de producto ────────────────────────────────────────────────────
export const getCategorias     = ()         => api.get('/inventario/categorias');
export const createCategoria   = (body)     => api.post('/inventario/categorias', body);
export const updateCategoria   = (id, body) => api.put(`/inventario/categorias/${id}`, body);
export const deleteCategoria   = (id)       => api.delete(`/inventario/categorias/${id}`);

// ── Productos ─────────────────────────────────────────────────────────────────
export const getProductos      = (params)   => api.get(`/inventario/productos${params ? `?${new URLSearchParams(params).toString()}` : ''}`);
export const createProducto    = (body)     => api.post('/inventario/productos', body);
export const updateProducto    = (id, body) => api.put(`/inventario/productos/${id}`, body);
export const cambiarEstadoProducto = (id, activo) => api.patch(`/inventario/productos/${id}/estado`, activo !== undefined ? { activo } : {});
export const patchProductoEstado = cambiarEstadoProducto;
export const deleteProducto    = (id)       => api.delete(`/inventario/productos/${id}`);

// ── Recetas (BOM) ─────────────────────────────────────────────────────────────
export const getReceta         = (idProducto)       => api.get(`/inventario/productos/${idProducto}/receta`);
export const saveReceta        = (idProducto, body) => api.put(`/inventario/productos/${idProducto}/receta`, body);

// ── Stock (para simulador de disponibilidad) ──────────────────────────────────
export const getStock          = (idSucursal) => api.get(`/inventario/stock${idSucursal ? `?idSucursal=${idSucursal}` : ''}`);
export const registrarMovimiento = (idInsumo, body) => api.post(`/inventario/insumos/${idInsumo}/movimientos`, body);
export const actualizarStockMinimo = (idInsumo, body) => api.patch(`/inventario/insumos/${idInsumo}/stock-minimo`, body);
