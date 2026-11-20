import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './facturas.detalle.repository.js';

// Detalle de una factura: encabezado, líneas compradas y abonos (con su resumen).
export async function obtenerDetalle(idCompra, userId) {
  const factura = await repo.obtenerEncabezado(idCompra, userId);
  if (!factura) throw new AppError('Factura no encontrada', 404);
  const [lineas, abonos, resumen] = await Promise.all([
    repo.listarLineas(idCompra),
    repo.listarAbonos(idCompra),
    repo.resumenPagos(idCompra),
  ]);
  const saldo = factura.estado_pago === 'PAGADO' ? '0.00' : resumen.saldo;
  return { ...factura, pagado: resumen.pagado, saldo, lineas, abonos };
}

function mapearErrorEliminar(error) {
  if (error.esAppError) return error;
  const pg = error.original ?? error.parent ?? error;
  if (pg.code === 'P0002') return new AppError('Factura no encontrada', 404);
  // fn_mover_stock: el insumo ya se usó y no alcanza para revertir la entrada.
  if (pg.code === 'P0001') {
    return new AppError(`No se puede eliminar: ${pg.message}. Registra primero un ajuste de inventario.`, 409);
  }
  return error;
}

// Eliminación lógica (solo ADMIN vía COM_ELIMINAR_FACTURA). La lógica vive en
// compras.fn_eliminar_factura: revierte stock, anula abonos y marca deleted_at/deleted_by.
export async function eliminarFactura(idCompra, motivo, userId) {
  try {
    await withTransaction(async (transaction) => {
      const factura = await repo.obtenerEncabezado(idCompra, userId, transaction);
      if (!factura) throw new AppError('Factura no encontrada', 404);
      await repo.eliminarFactura(idCompra, userId, motivo, transaction);
    }, userId);
  } catch (error) {
    throw mapearErrorEliminar(error);
  }
}
