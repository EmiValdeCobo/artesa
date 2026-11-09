import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './preparacion.repository.js';

// Flujo de preparación: ABIERTA → EN_PREPARACION → LISTA → ENTREGADA (solo hacia adelante).
const TRANSICIONES = {
  ABIERTA: ['EN_PREPARACION'],
  EN_PREPARACION: ['LISTA'],
  LISTA: ['ENTREGADA'],
};

export const listarCola = (filtros, userId) => repo.listarCola(userId, filtros);

export async function cambiarEstado(idOrden, nuevoEstado, userId) {
  return withTransaction(async (transaction) => {
    const orden = await repo.bloquearOrden(transaction, idOrden);
    if (!orden) throw new AppError('La orden no existe', 404);
    if (!(await repo.usuarioTieneSucursal(userId, orden.id_sucursal, transaction))) {
      throw new AppError('La orden pertenece a una sucursal que no tienes asignada', 403);
    }
    if (!(TRANSICIONES[orden.estado] ?? []).includes(nuevoEstado)) {
      throw new AppError(`No se puede pasar una orden de ${orden.estado} a ${nuevoEstado}`, 409);
    }
    const actualizada = await repo.actualizarEstado(transaction, idOrden, nuevoEstado);
    return { ...actualizada, estado_anterior: orden.estado };
  }, userId);
}
