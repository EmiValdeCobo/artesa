import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './inventario.repository.js';

function traducir(error) {
  const pg = error.original ?? error.parent ?? error;
  if (pg.code === '23505') return new AppError('Ya existe un registro con ese código o nombre', 409);
  if (pg.code === '23503') return new AppError('La unidad, categoría, insumo o sucursal seleccionada no existe', 400);
  if (pg.code === 'P0001') return new AppError(pg.message, 409);
  return error;
}
async function validarSucursal(userId, idSucursal, transaction) {
  if (!(await repo.sucursalAsignada(userId, idSucursal, transaction))) throw new AppError('No tienes asignada esta sucursal', 403);
}
function run(fn) { return fn().catch((e) => { throw traducir(e); }); }
export const listarUnidades = () => repo.listarUnidades();
export const crearUnidad = (d, uid) => run(() => withTransaction((t) => repo.crearUnidad(d, t), uid));
export const actualizarUnidad = (id, d, uid) => run(() => withTransaction(async (t) => { const x = await repo.actualizarUnidad(id, d, t); if (!x) throw new AppError('Unidad no encontrada', 404); return x; }, uid));
export const eliminarUnidad = (id, uid) => run(() => withTransaction(async (t) => {
  if (!(await repo.buscarUnidad(id, t))) throw new AppError('Unidad no encontrada', 404);
  const usos = await repo.insumosQueUsanUnidad(id, t);
  if (usos.length) {
    const nombres = usos.slice(0, 5).map((x) => x.nombre);
    const resto = usos.length > 5 ? ' y más' : '';
    throw new AppError(`No se puede desactivar: la usan ${nombres.join(', ')}${resto}`, 409);
  }
  await repo.actualizarUnidad(id, { activo: false }, t);
}, uid));
export const listarInsumos = async (uid) => repo.listarInsumos(await repo.usuarioTienePermiso(uid, 'INV_VER_COSTOS'));
export const crearInsumo = (d, uid) => run(() => withTransaction(async (t) => { if (!(await repo.buscarUnidad(d.idUnidadBase, t))) throw new AppError('La unidad de medida no existe', 400); return repo.crearInsumo(d, t); }, uid));
export const actualizarInsumo = (id, d, uid) => run(() => withTransaction(async (t) => { if (!(await repo.buscarUnidad(d.idUnidadBase, t))) throw new AppError('La unidad de medida no existe', 400); const x = await repo.actualizarInsumo(id, d, t); if (!x) throw new AppError('Insumo no encontrado', 404); return x; }, uid));
export const desactivarInsumo = (id, uid) => run(() => withTransaction(async (t) => {
  if (!(await repo.buscarInsumo(id, t))) throw new AppError('Insumo no encontrado', 404);
  const usos = await repo.productosQueUsanInsumo(id, t);
  if (usos.length) {
    const nombres = usos.slice(0, 5).map((x) => x.nombre);
    const resto = usos.length > 5 ? ` y ${usos.length - 5} más` : '';
    throw new AppError(`No se puede desactivar. Lo usan: ${nombres.join(', ')}${resto}`, 409);
  }
  await repo.desactivarInsumo(id, t);
}, uid));
export const listarCategorias = () => repo.listarCategorias();
export const listarProductos = async (uid) => repo.listarProductos(await repo.usuarioTienePermiso(uid, 'INV_VER_COSTOS'));
export const crearProducto = (d, uid) => run(() => withTransaction((t) => repo.escribirProducto(d, t), uid));
export const actualizarProducto = (id, d, uid) => run(() => withTransaction(async (t) => { const x = await repo.escribirProducto(d, t, id); if (!x) throw new AppError('Producto no encontrado', 404); return x; }, uid));
export const desactivarProducto = (id, uid) => withTransaction(async (t) => { if (!(await repo.desactivarProducto(id, t))) throw new AppError('Producto no encontrado', 404); }, uid);
export const obtenerReceta = async (id, uid) => { const p = await repo.buscarProducto(id); if (!p) throw new AppError('Producto no encontrado', 404); if (!p.es_elaborado) throw new AppError('Los productos de reventa no usan receta', 400); return repo.recetaActual(id, await repo.usuarioTienePermiso(uid, 'INV_VER_COSTOS')); };
export const guardarReceta = (id, d, uid) => run(() => withTransaction(async (t) => { const p = await repo.buscarProducto(id, t); if (!p) throw new AppError('Producto no encontrado', 404); if (!p.es_elaborado) throw new AppError('Los productos de reventa no usan receta', 400); for (const c of d.componentes) { const i = await repo.buscarInsumo(c.idInsumo, t); if (!i?.activo) throw new AppError(`El insumo ${c.idInsumo} no existe o está inactivo`, 400); } await repo.guardarReceta(id, d.componentes, t); return repo.recetaActual(id, await repo.usuarioTienePermiso(uid, 'INV_VER_COSTOS'), t); }, uid));
export async function listarStock(userId, idSucursal) { const ids = idSucursal ? [idSucursal] : (await repo.sucursalesAsignadas(userId)).map((x) => x.id_sucursal); if (idSucursal) await validarSucursal(userId, idSucursal); return repo.stockSucursal(idSucursal ?? null).then((rows) => rows.filter((r) => ids.includes(r.id_sucursal))); }
export async function listarAlertas(userId, idSucursal) { const ids = idSucursal ? [idSucursal] : (await repo.sucursalesAsignadas(userId)).map((x) => x.id_sucursal); if (idSucursal) await validarSucursal(userId, idSucursal); const rows = await repo.alertas(idSucursal ?? null); return rows.filter((r) => ids.includes(r.id_sucursal)); }
export async function listarMovimientos(userId, idSucursal, idInsumo) {
  if (idSucursal) await validarSucursal(userId, idSucursal);
  const verCostos = await repo.usuarioTienePermiso(userId, 'INV_VER_COSTOS');
  return repo.movimientos(userId, idSucursal ?? null, idInsumo ?? null, verCostos);
}
export const configurarMinimo = (idInsumo, d, uid) => run(() => withTransaction(async (t) => { await validarSucursal(uid, d.idSucursal, t); if (!(await repo.buscarInsumo(idInsumo, t))) throw new AppError('Insumo no encontrado', 404); return repo.configurarMinimo(d.idSucursal, idInsumo, d.stockMinimo, t); }, uid));
export const ingresarStock = (idInsumo, d, uid) => run(() => withTransaction(async (t) => { await validarSucursal(uid, d.idSucursal, t); const i = await repo.buscarInsumo(idInsumo, t); if (!i?.activo) throw new AppError('Insumo no existe o está inactivo', 404); return repo.moverStock(t, { ...d, idInsumo, idUsuario: uid }); }, uid));
export const registrarMerma = (idInsumo, d, uid) => run(() => withTransaction(async (t) => { await validarSucursal(uid, d.idSucursal, t); const i = await repo.buscarInsumo(idInsumo, t); if (!i?.activo) throw new AppError('Insumo no existe o está inactivo', 404); await repo.registrarMerma(t, { ...d, idInsumo, idUsuario: uid }); return { registrado: true }; }, uid));
