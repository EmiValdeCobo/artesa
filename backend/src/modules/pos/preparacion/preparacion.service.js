import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './preparacion.repository.js';

// Flujo de preparación: ABIERTA → EN_PREPARACION → LISTA → ENTREGADA (solo hacia adelante).
const TRANSICIONES = {
  ABIERTA: ['EN_PREPARACION'],
  EN_PREPARACION: ['LISTA'],
  LISTA: ['ENTREGADA'],
};

// El alcance por sucursal lo impone el repositorio con usuario_sucursal (no se confía en el frontend).
export async function listarCola(filtros, userId) {
  if (filtros.idSucursal && !(await repo.usuarioTieneSucursal(userId, filtros.idSucursal))) {
    throw new AppError('No tienes asignada esa sucursal', 403);
  }
  return repo.listarCola(userId, filtros);
}

async function bloquearOrdenDeMiSucursal(transaction, idOrden, userId) {
  const orden = await repo.bloquearOrden(transaction, idOrden);
  if (!orden) throw new AppError('La orden no existe', 404);
  if (!(await repo.usuarioTieneSucursal(userId, orden.id_sucursal, transaction))) {
    throw new AppError('La orden pertenece a una sucursal que no tienes asignada', 403);
  }
  return orden;
}

export async function cambiarEstado(idOrden, nuevoEstado, userId) {
  return withTransaction(async (transaction) => {
    const orden = await bloquearOrdenDeMiSucursal(transaction, idOrden, userId);
    if (!(TRANSICIONES[orden.estado] ?? []).includes(nuevoEstado)) {
      throw new AppError(`No se puede pasar una orden de ${orden.estado} a ${nuevoEstado}`, 409);
    }
    const actualizada = await repo.actualizarEstado(transaction, idOrden, nuevoEstado);
    return { ...actualizada, estado_anterior: orden.estado };
  }, userId);
}

// RN: solo se cancela un pedido "Nueva" (ABIERTA), siempre con motivo. Si ya se cobró, cancelar
// el pedido anula su venta (fn_anular_venta revierte stock) y exige POS_ANULAR_VENTA.
export async function anularOrden(idOrden, motivo, userId) {
  return withTransaction(async (transaction) => {
    const orden = await bloquearOrdenDeMiSucursal(transaction, idOrden, userId);
    if (orden.estado !== 'ABIERTA') {
      throw new AppError('Solo se puede cancelar un pedido en estado Nueva (antes de iniciar su preparación)', 409);
    }
    const venta = await repo.ventaEmitidaDeOrden(transaction, idOrden);
    if (!venta) {
      const anulada = await repo.anularOrden(transaction, idOrden, motivo);
      return { ...anulada, venta_anulada: null };
    }
    if (!(await repo.usuarioTienePermiso(userId, 'POS_ANULAR_VENTA'))) {
      throw new AppError('El pedido ya se cobró: cancelarlo anula la venta y requiere el permiso POS_ANULAR_VENTA', 403);
    }
    try {
      await repo.anularVentaDeOrden(transaction, { idVenta: venta.id_venta, motivo, idUsuario: userId });
    } catch (error) {
      const origen = error.original ?? error.parent ?? error;
      if (origen.code === 'P0001') throw new AppError(origen.message, 409);
      throw error;
    }
    return { id_orden: idOrden, estado: 'ANULADA', venta_anulada: venta.id_venta };
  }, userId);
}
