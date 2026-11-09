import { api } from '../../api/client.js';
import { productosSemilla } from './productosSemilla.js';

// false = datos reales del backend de Inventario; true = datos semilla locales.
const USAR_DATOS_SEMILLA = false;

// Prefijo del router de inventario, sin el "/api" inicial (el cliente ya lo agrega).
// Si te da 404, cámbialo por el que corresponda a la URL de tu backend.
const BASE = '/inventario';

// Hasta que exista un selector de sucursal, se usa esta (o la primera que devuelva el stock).
const SUCURSAL_POR_DEFECTO = 1;

// Los productos elaborados no tienen stock propio; se marcan "bajo" con este umbral de unidades.
const STOCK_BAJO_ELABORADOS = 5;

const num = (valor) => Number(valor ?? 0);

// Unidades que se pueden preparar: el insumo más escaso de la receta limita el resultado.
function unidadesPreparables(receta, stockPorInsumo) {
  if (!receta.length) return 0; // sin receta cargada no se puede garantizar nada
  return Math.floor(Math.min(...receta.map((c) => num(stockPorInsumo.get(c.id_insumo)) / num(c.cantidad_requerida))));
}

export async function obtenerProductos() {
  if (USAR_DATOS_SEMILLA) return productosSemilla;

  const [productos, filasStock] = await Promise.all([
    api.get(`${BASE}/productos`),
    api.get(`${BASE}/stock`),
  ]);

  const idSucursal = filasStock.some((f) => f.id_sucursal === SUCURSAL_POR_DEFECTO)
    ? SUCURSAL_POR_DEFECTO
    : filasStock[0]?.id_sucursal;

  const stockPorInsumo = new Map();
  const minimoPorInsumo = new Map();
  filasStock
    .filter((f) => f.id_sucursal === idSucursal)
    .forEach((f) => {
      stockPorInsumo.set(f.id_insumo, num(f.stock_actual));
      minimoPorInsumo.set(f.id_insumo, num(f.stock_minimo));
    });

  const activos = productos.filter((p) => p.activo && !p.deleted_at);

  // Solo los elaborados tienen receta; el resto no necesita petición.
  const recetas = await Promise.all(
    activos.map((p) => (p.es_elaborado ? api.get(`${BASE}/productos/${p.id_producto}/receta`) : Promise.resolve([]))),
  );

  return activos.map((p, i) => {
    const base = {
      id_producto: p.id_producto,
      nombre: p.nombre,
      categoria: p.categoria ?? 'Sin categoría',
      precio: num(p.precio_venta),
    };
    if (p.es_elaborado) {
      return { ...base, tipo: 'elaborado', stock: unidadesPreparables(recetas[i], stockPorInsumo), stock_minimo: STOCK_BAJO_ELABORADOS };
    }
    return {
      ...base,
      tipo: 'reventa',
      stock: num(stockPorInsumo.get(p.id_insumo_reventa)),
      stock_minimo: num(minimoPorInsumo.get(p.id_insumo_reventa)),
    };
  });
}