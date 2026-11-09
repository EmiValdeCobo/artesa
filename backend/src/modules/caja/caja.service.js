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
  // RAISE EXCEPTION de las funciones SQL (reglas de negocio): se muestra el mensaje en español.
  if (origen.code === 'P0001') return new AppError(origen.message, 409);
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

// ---------- Cierre y cuadre ----------
// Texto de la diferencia sin float: la BD devuelve strings como "-5.00", "0.00" o "12.50".
const resultadoDiferencia = (dif) => {
  if (dif === null || dif === undefined) return null;
  if (dif.startsWith('-')) return 'FALTANTE';
  return /^0(\.0+)?$/.test(dif) ? 'CUADRADO' : 'SOBRANTE';
};

const porMetodo = (fila, metodo) => ({
  esperado: fila[`esperado_${metodo}`],
  contado: fila[`contado_${metodo}`],
  diferencia: fila[`dif_${metodo}`],
  resultado: resultadoDiferencia(fila[`dif_${metodo}`]),
});

function formatearCuadre(fila) {
  return {
    id_turno: fila.id_turno,
    estado: fila.estado,
    caja: fila.caja,
    sucursal: fila.sucursal,
    cajero: fila.cajero,
    abierto_en: fila.abierto_en,
    cerrado_en: fila.cerrado_en,
    monto_apertura: fila.monto_apertura,
    ventas: { efectivo: fila.ventas_efectivo, tarjeta: fila.ventas_tarjeta, digital: fila.ventas_digital },
    ingresos_caja: fila.ingresos_caja,
    egresos_caja: fila.egresos_caja,
    efectivo: porMetodo(fila, 'efectivo'),
    tarjeta: porMetodo(fila, 'tarjeta'),
    digital: porMetodo(fila, 'digital'),
  };
}

// RN: solo el cajero dueño cierra su turno, una sola vez. La función SQL calcula lo esperado, guarda
// lo contado y las diferencias (contado - esperado; negativo = faltante) y marca el turno CERRADO.
export async function cerrarTurno(idTurno, contado, userId) {
  try {
    return await withTransaction(async (transaction) => {
      const turno = await repo.bloquearTurno(transaction, idTurno);
      if (!turno) throw new AppError('El turno no existe', 404);
      if (turno.id_usuario !== userId) throw new AppError('Solo el cajero del turno puede cerrarlo', 403);
      if (turno.estado !== 'ABIERTO') throw new AppError('El turno ya está cerrado', 409);
      await repo.cerrarTurno(transaction, { idTurno, ...contado });
      return formatearCuadre(await repo.buscarCuadre(idTurno, transaction));
    }, userId);
  } catch (error) {
    throw traducirError(error);
  }
}

// El dueño ve su cuadre; otro usuario necesita CAJA_VER_CUADRES y pertenecer a la sucursal del turno.
export async function obtenerCuadre(idTurno, userId) {
  const fila = await repo.buscarCuadre(idTurno);
  if (!fila) throw new AppError('El turno no existe', 404);
  if (fila.id_usuario !== userId) {
    const puede = (await repo.usuarioTienePermiso(userId, 'CAJA_VER_CUADRES'))
      && (await repo.usuarioTieneSucursal(userId, fila.id_sucursal));
    if (!puede) throw new AppError('No tienes permiso para ver el cuadre de este turno', 403);
  }
  return formatearCuadre(fila);
}

export async function listarCuadres(filtros, userId) {
  return (await repo.listarCuadres(userId, filtros)).map(formatearCuadre);
}
