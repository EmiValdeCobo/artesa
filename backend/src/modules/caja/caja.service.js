import { withTransaction } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './caja.repository.js';

// Sequelize envuelve el error de PostgreSQL en .parent/.original. Los índices únicos parciales
// (uq_turno_abierto_*) son la última barrera cuando dos aperturas llegan al mismo tiempo.
function traducirError(error) {
  const origen = error.original ?? error.parent ?? error;
  if (origen.code === '23505' && origen.constraint === 'uq_turno_abierto_caja') {
    return new AppError('La caja ya tiene un turno abierto', 409);
  }
  if (origen.code === '23505' && origen.constraint === 'uq_turno_abierto_usuario') {
    return new AppError('Ya tienes un turno abierto; ciérralo antes de abrir otro', 409);
  }
  return error;
}

export const listarCajas = (userId) => repo.listarCajasDeUsuario(userId);

export async function obtenerTurnoActual(userId) {
  const turno = await repo.buscarTurnoActual(userId);
  if (!turno) throw new AppError('No tienes un turno abierto', 404);
  return turno;
}

// RN: un solo turno ABIERTO por caja y un solo turno ABIERTO por cajero.
export async function abrirTurno({ idCaja, montoApertura }, userId) {
  try {
    return await withTransaction(async (transaction) => {
      const caja = await repo.buscarCaja(idCaja, transaction);
      if (!caja) throw new AppError('La caja no existe', 404);
      if (!caja.sucursal_activa) throw new AppError('La sucursal de la caja está inactiva', 400);
      if (!(await repo.usuarioTieneSucursal(userId, caja.id_sucursal, transaction))) {
        throw new AppError('No tienes asignada la sucursal de esta caja', 403);
      }
      if (await repo.buscarTurnoAbierto({ id_usuario: userId }, transaction)) {
        throw new AppError('Ya tienes un turno abierto; ciérralo antes de abrir otro', 409);
      }
      if (await repo.buscarTurnoAbierto({ id_caja: idCaja }, transaction)) {
        throw new AppError('La caja ya tiene un turno abierto', 409);
      }
      const idTurno = await repo.crearTurno(transaction, { idCaja, idUsuario: userId, montoApertura });
      return repo.buscarTurno(idTurno, transaction);
    }, userId);
  } catch (error) {
    throw traducirError(error);
  }
}

// RN: solo el cajero dueño del turno ABIERTO registra movimientos; un egreso no puede dejar el efectivo en negativo.
export async function registrarMovimiento(idTurno, { tipo, concepto, monto }, userId) {
  return withTransaction(async (transaction) => {
    const turno = await repo.bloquearTurno(transaction, idTurno);
    if (!turno) throw new AppError('El turno no existe', 404);
    if (turno.id_usuario !== userId) throw new AppError('Solo el cajero del turno puede registrar movimientos', 403);
    if (turno.estado !== 'ABIERTO') throw new AppError('El turno está cerrado', 409);
    if (tipo === 'EGRESO') {
      const efectivo = await repo.efectivoEnCaja(transaction, idTurno, monto);
      if (!efectivo.alcanza) {
        throw new AppError(`Efectivo insuficiente en caja (disponible: $${efectivo.esperado_efectivo})`, 409);
      }
    }
    return repo.crearMovimiento(transaction, { idTurno, tipo, concepto, monto, idUsuario: userId });
  }, userId);
}

// El dueño del turno ve sus movimientos; el resto necesita CAJA_VER_CUADRES (gerente/contador).
export async function listarMovimientos(idTurno, userId) {
  const turno = await repo.buscarTurno(idTurno);
  if (!turno) throw new AppError('El turno no existe', 404);
  if (turno.id_usuario !== userId && !(await repo.usuarioTienePermiso(userId, 'CAJA_VER_CUADRES'))) {
    throw new AppError('No tienes permiso para ver los movimientos de este turno', 403);
  }
  return repo.listarMovimientos(idTurno);
}
