import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './facturas.repository.js';

function validarProveedor(proveedor) {
  if (!proveedor || proveedor.deleted_at) throw new AppError('Proveedor no encontrado', 404);
  if (!proveedor.activo) throw new AppError('El proveedor está inactivo', 409);
}

function validarSucursal(sucursal) {
  if (!sucursal || sucursal.deleted_at) throw new AppError('Sucursal no encontrada', 404);
  if (!sucursal.activa) throw new AppError('La sucursal está inactiva', 409);
}

function validarInsumos(insumos, items) {
  const encontrados = new Map(insumos.map((insumo) => [insumo.id_insumo, insumo]));
  const idsSolicitados = new Set(items.map((item) => item.idInsumo));
  for (const idInsumo of idsSolicitados) {
    const insumo = encontrados.get(idInsumo);
    if (!insumo || insumo.deleted_at) throw new AppError(`El insumo ${idInsumo} no existe`, 404);
    if (!insumo.activo) throw new AppError(`El insumo ${idInsumo} está inactivo`, 409);
  }
}

function montoPositivo(monto) {
  return /[1-9]/.test(String(monto).replace('.', ''));
}

function mapearErrorCompra(error) {
  if (error.esAppError) return error;
  const pg = error.original ?? error.parent ?? error;
  if (pg.code === '23505') return new AppError('Ya existe una factura con ese número para el proveedor', 409);
  if (pg.code === 'P0001') return new AppError(pg.message, 400);
  if (pg.code === '23503') return new AppError('Una referencia de la compra dejó de ser válida', 409);
  if (['23502', '23514', '22001', '22003', '22008', '22P02'].includes(pg.code)) {
    return new AppError('Los datos de la compra no cumplen las reglas de la base de datos', 400);
  }
  return error;
}

export async function registrarCompra(datos, userId) {
  try {
    return await withTransaction(async (transaction) => {
      validarProveedor(await repo.buscarProveedor(datos.idProveedor, transaction));
      validarSucursal(await repo.buscarSucursal(datos.idSucursal, transaction));
      if (datos.tipoCosto === 'COSTO') {
        const idsInsumo = [...new Set(datos.items.map((item) => item.idInsumo))].sort((a, b) => a - b);
        const insumos = await repo.buscarInsumos(idsInsumo, transaction);
        validarInsumos(insumos, datos.items);
      }
      const idCompra = await repo.registrarCompra(datos, userId, transaction);
      if (!idCompra) throw new AppError('La base de datos no devolvió el identificador de la factura', 500);
      const compra = await repo.obtenerCompra(idCompra, transaction);
      if (!compra) throw new AppError('No se pudo recuperar el total calculado de la factura', 500);
      if (!montoPositivo(compra.total)) throw new AppError('La compra debe tener un total mayor que cero', 400);

      if (datos.condicionPago === 'CONTADO') {
        const idPago = await repo.insertarPagoContado(idCompra, userId, transaction);
        if (!idPago) throw new AppError('No se pudo registrar el pago automático de la factura', 500);
        if (await repo.obtenerEstadoPago(idCompra, transaction) !== 'PAGADO') {
          throw new AppError('No se pudo confirmar el pago total de la factura', 500);
        }
      } else if (compra.estado_pago !== 'PENDIENTE') {
        throw new AppError('La factura a crédito no quedó pendiente de pago', 500);
      }

      // El precio de venta no se ajusta solo: se avisa a quien puede ver costos qué
      // productos quedaron con margen bajo tras esta compra. Un GASTO no toca inventario.
      let alertasMargen = [];
      if (datos.tipoCosto === 'COSTO' && await repo.usuarioTienePermiso(userId, 'INV_VER_COSTOS', transaction)) {
        const idsInsumo = [...new Set(datos.items.map((item) => item.idInsumo))];
        alertasMargen = await repo.alertasMargenPorInsumos(idsInsumo, transaction);
      }

      return { idCompra, alertasMargen };
    }, userId);
  } catch (error) {
    throw mapearErrorCompra(error);
  }
}
