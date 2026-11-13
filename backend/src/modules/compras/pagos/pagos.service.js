import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './pagos.repository.js';

function mapearErrorPago(error) {
  if (error.esAppError) return error;
  const pg = error.original ?? error.parent ?? error;
  if (pg.code === 'P0001') return new AppError(pg.message || 'El pago supera el saldo pendiente', 409);
  if (pg.code === '23503') return new AppError('La factura ya no existe', 404);
  if (pg.code === '23514' || pg.code === '23502' || pg.code === '22003' || pg.code === '22P02') {
    return new AppError('Los datos del pago no son válidos', 400);
  }
  if (pg.code === '23505') return new AppError('No se pudo registrar el pago por un conflicto de datos', 409);
  return error;
}

export async function registrarPago(idCompra, datos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      const factura = await repo.buscarFacturaParaPago(idCompra, transaction);
      if (!factura) throw new AppError('Factura no encontrada', 404);
      if (factura.estado_pago === 'PAGADO') throw new AppError('La factura ya está pagada', 409);

      const idPago = await repo.insertarPago(idCompra, datos, userId, transaction);
      if (!idPago) throw new AppError('La base de datos no devolvió el identificador del pago', 500);
      const pago = await repo.obtenerPagoRegistrado(idPago, transaction);
      if (!pago) throw new AppError('No se pudo recuperar el pago registrado', 500);
      return pago;
    }, userId);
  } catch (error) {
    throw mapearErrorPago(error);
  }
}
