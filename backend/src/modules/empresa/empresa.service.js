import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './empresa.repository.js';

const capturar = (e) => { const pg = e.original ?? e.parent ?? e; if (pg.code === '23505') throw new AppError('El código de establecimiento ya está registrado', 409); throw e; };
export const listarSucursales = () => repo.listarSucursales();
export const listarParametros = () => repo.listarParametros();
export const crearSucursal = (d, uid) => withTransaction(async (t) => { const sucursal = await repo.crearSucursal(d, t).catch(capturar); await repo.crearCajaPorDefecto(sucursal.id_sucursal, t); await repo.asignarAdministradores(sucursal.id_sucursal, t); if (uid) await repo.asignarSucursalAUsuario(uid, sucursal.id_sucursal, t); return sucursal; }, uid);
export const actualizarSucursal = (id, d, uid) => withTransaction(async (t) => { const row = await repo.actualizarSucursal(id, d, t).catch(capturar); if (!row) throw new AppError('Sucursal no encontrada', 404); return row; }, uid);
export const cambiarEstadoSucursal = (id, activa, uid) => withTransaction(async (t) => { const row = await repo.cambiarEstadoSucursal(id, activa, t); if (!row) throw new AppError('Sucursal no encontrada', 404); return row; }, uid);
export const actualizarParametro = (d, uid) => withTransaction(async (t) => { const row = await repo.actualizarParametro(d.clave, d.valor, t); if (!row) throw new AppError('Parámetro no encontrado', 404); return row; }, uid);

// Estado de apertura: personal asignado, cajas y stock mínimo por insumo requerido. `lista` es el veredicto para operar.
async function estadoApertura(id, t) {
  const sucursal = await repo.buscarSucursal(id, t);
  if (!sucursal) throw new AppError('Sucursal no encontrada', 404);
  const [usuarios, cajas, insumos] = await Promise.all([repo.usuariosDeSucursal(id, t), repo.cajasDeSucursal(id, t), repo.insumosParaOperar(id, t)]);
  const lista = sucursal.activa && usuarios.length > 0 && cajas.length > 0 && insumos.length > 0 && insumos.every((i) => i.cubierto);
  return { sucursal, usuarios, cajas, insumos, lista };
}
export const obtenerApertura = (id) => estadoApertura(id);
export const registrarApertura = (id, d, uid) => withTransaction(async (t) => {
  const { insumos } = await estadoApertura(id, t);
  const permitidos = new Set(insumos.map((i) => i.id_insumo));
  if (d.items.some((x) => !permitidos.has(x.idInsumo))) throw new AppError('Uno de los insumos no es requerido por el catálogo activo', 400);
  for (const x of d.items) {
    await repo.configurarMinimo(id, x.idInsumo, x.stockMinimo, t);
    if (x.cantidadInicial > 0) await repo.cargarStockInicial(id, x.idInsumo, x.cantidadInicial, uid, t);
  }
  return estadoApertura(id, t);
}, uid);
