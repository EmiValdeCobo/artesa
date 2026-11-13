import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './proveedores.repository.js';

export const listarProveedores = (activo) => repo.listarProveedores(activo);

export const crearProveedor = (datos, userId) => withTransaction(
  (transaction) => repo.crearProveedor(datos, transaction),
  userId,
);

export const actualizarProveedor = (id, datos, userId) => withTransaction(async (transaction) => {
  const actual = await repo.buscarProveedor(id, transaction);
  if (!actual || actual.deleted_at) throw new AppError('Proveedor no encontrado', 404);
  const actualizado = await repo.actualizarProveedor(id, datos, transaction);
  if (!actualizado) throw new AppError('Proveedor no encontrado', 404);
  return actualizado;
}, userId);

export const desactivarProveedor = (id, userId) => withTransaction(async (transaction) => {
  const actual = await repo.buscarProveedor(id, transaction);
  if (!actual || actual.deleted_at) throw new AppError('Proveedor no encontrado', 404);
  if (!actual.activo) throw new AppError('El proveedor ya está inactivo', 409);
  const desactivado = await repo.desactivarProveedor(id, transaction);
  if (!desactivado) throw new AppError('Proveedor no encontrado', 404);
}, userId);
