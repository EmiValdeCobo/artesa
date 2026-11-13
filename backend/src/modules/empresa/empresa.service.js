import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './empresa.repository.js';

const capturar = (e) => { const pg = e.original ?? e.parent ?? e; if (pg.code === '23505') throw new AppError('El código de establecimiento ya está registrado', 409); throw e; };
export const listarSucursales = () => repo.listarSucursales();
export const listarParametros = () => repo.listarParametros();
export const crearSucursal = (d, uid) => withTransaction((t) => repo.crearSucursal(d, t).catch(capturar), uid);
export const actualizarSucursal = (id, d, uid) => withTransaction(async (t) => { const row = await repo.actualizarSucursal(id, d, t).catch(capturar); if (!row) throw new AppError('Sucursal no encontrada', 404); return row; }, uid);
export const cambiarEstadoSucursal = (id, activa, uid) => withTransaction(async (t) => { const row = await repo.cambiarEstadoSucursal(id, activa, t); if (!row) throw new AppError('Sucursal no encontrada', 404); return row; }, uid);
export const actualizarParametro = (d, uid) => withTransaction(async (t) => { const row = await repo.actualizarParametro(d.clave, d.valor, t); if (!row) throw new AppError('Parámetro no encontrado', 404); return row; }, uid);
