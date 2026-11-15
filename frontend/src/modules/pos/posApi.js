import { api } from '../../api/client.js';
import { productosSemilla } from './productosSemilla.js';

// false = datos reales del backend de Inventario; true = datos semilla locales.
const USAR_DATOS_SEMILLA = false;

// Prefijo del router de inventario, sin el "/api" inicial (el cliente ya lo agrega).
// Si te da 404, cámbialo por el que corresponda a la URL de tu backend.
const BASE = '/inventario';

// Los productos elaborados no tienen stock propio; se marcan "bajo" con este umbral de unidades.
const STOCK_BAJO_ELABORADOS = 5;

const num = (valor) => Number(valor ?? 0);

// Unidades que se pueden preparar: el insumo más escaso de la receta limita el resultado.
function unidadesPreparables(receta, stockPorInsumo) {
  if (!receta || !receta.length) return 0; // sin receta cargada no se puede garantizar nada
  return Math.floor(Math.min(...receta.map((c) => num(stockPorInsumo.get(c.id_insumo)) / num(c.cantidad_requerida))));
}

export async function obtenerProductos(idSucursal = null) {
  if (USAR_DATOS_SEMILLA) return productosSemilla;

  const queryStock = idSucursal ? `?idSucursal=${idSucursal}` : '';

  // En lugar de hacer N peticiones de receta por cada producto (N+1),
  // se consultan productos, stock de la sucursal y recetas en lote (3 peticiones en paralelo).
  const [productos, filasStock, recetasBulk] = await Promise.all([
    api.get(`${BASE}/productos?activo=true`),
    api.get(`${BASE}/stock${queryStock}`),
    api.get(`${BASE}/recetas`).catch(() => null),
  ]);

  const idSucursalEfectiva = idSucursal
    ? (filasStock.some((f) => Number(f.id_sucursal) === Number(idSucursal)) ? Number(idSucursal) : Number(filasStock[0]?.id_sucursal))
    : Number(filasStock[0]?.id_sucursal);

  const stockPorInsumo = new Map();
  const minimoPorInsumo = new Map();
  filasStock
    .filter((f) => !idSucursalEfectiva || Number(f.id_sucursal) === idSucursalEfectiva)
    .forEach((f) => {
      stockPorInsumo.set(f.id_insumo, num(f.stock_actual));
      minimoPorInsumo.set(f.id_insumo, num(f.stock_minimo));
    });

  const activos = productos.filter((p) => p.activo && !p.deleted_at);

  // Mapa de recetas agrupadas por id_producto (lookup O(1) en memoria)
  const mapaRecetas = new Map();
  if (Array.isArray(recetasBulk)) {
    for (const r of recetasBulk) {
      const idProd = Number(r.id_producto);
      if (!mapaRecetas.has(idProd)) mapaRecetas.set(idProd, []);
      mapaRecetas.get(idProd).push(r);
    }
  }

  return activos.map((p) => {
    const base = {
      id_producto: p.id_producto,
      nombre: p.nombre,
      categoria: p.categoria ?? 'Sin categoría',
      id_categoria: p.id_categoria ?? null,
      precio: num(p.precio_venta),
    };
    if (p.es_elaborado) {
      const receta = mapaRecetas.get(Number(p.id_producto)) || [];
      return {
        ...base,
        tipo: 'elaborado',
        stock: unidadesPreparables(receta, stockPorInsumo),
        stock_minimo: STOCK_BAJO_ELABORADOS,
      };
    }
    return {
      ...base,
      tipo: 'reventa',
      stock: num(stockPorInsumo.get(p.id_insumo_reventa)),
      stock_minimo: num(minimoPorInsumo.get(p.id_insumo_reventa)),
    };
  });
}

// ── Clientes (T18) ────────────────────────────────────────────────────────────
export async function listarClientes({ q = '', soloCcf = false } = {}) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (soloCcf) params.set('solo_ccf', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get(`/pos/clientes${query}`);
  const lista = res?.clientes ?? res?.data?.clientes ?? res?.data ?? res;
  return Array.isArray(lista) ? lista : [];
}

export const crearCliente = (payload) => api.post('/pos/clientes', payload);

export const actualizarCliente = (idCliente, payload) => api.put(`/pos/clientes/${idCliente}`, payload);

export const eliminarCliente = (idCliente) => api.delete(`/pos/clientes/${idCliente}`);

// ── Ventas y Anulación (T17 / T18) ────────────────────────────────────────────
export async function listarVentas({ idTurno = '', estado = '' } = {}) {
  const params = new URLSearchParams();
  if (idTurno) params.set('id_turno', idTurno);
  if (estado) params.set('estado', estado);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await api.get(`/pos/ventas${query}`);
  const lista = res?.ventas ?? res?.data?.ventas ?? res?.data ?? res;
  return Array.isArray(lista) ? lista : [];
}

export async function obtenerDetalleVenta(idVenta) {
  const res = await api.get(`/pos/ventas/${idVenta}`);
  return res?.data ?? res;
}

export const anularVenta = (idVenta, motivo) => api.patch(`/pos/ventas/${idVenta}/anular`, { motivo });