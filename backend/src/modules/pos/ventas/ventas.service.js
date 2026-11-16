import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './ventas.repository.js';

// ── Mapeo de errores PostgreSQL P0001 → AppError HTTP ────────────────────────
function mapearErrorPG(err) {
  if (err instanceof AppError) return err;
  const origen = err.original ?? err.parent ?? err;
  const msg = origen.message ?? err.message ?? '';
  const code = origen.code ?? err.code;
  if (code === 'P0001') {
    if (msg.includes('turno no existe') || msg.includes('está cerrado')) return new AppError(msg, 400);
    if (msg.includes('no pertenece al usuario') || msg.includes('sucursal')) return new AppError(msg, 403);
    if (msg.includes('Orden no existe')) return new AppError(msg, 404);
    if (msg.includes('ya está facturada') || msg.includes('está anulada')) return new AppError(msg, 409);
    if (msg.includes('CCF requiere cliente')) return new AppError(msg, 400);
    if (msg.includes('no cuadran')) return new AppError(msg, 400);
    if (msg.includes('inexistentes') || msg.includes('inactivos')) return new AppError(msg, 400);
    if (msg.includes('descuento no puede superar')) return new AppError(msg, 400);
    if (msg.includes('no tiene productos')) return new AppError(msg, 400);
    // Casos de anulación de venta
    if (msg.includes('Venta no existe')) return new AppError(msg, 404);
    if (msg.includes('ya está anulada')) return new AppError(msg, 409);
    if (msg.includes('El turno ya cerró')) return new AppError(msg, 409);
    return new AppError(msg, 400);
  }
  if (code === '23505') return new AppError('Conflicto al generar el correlativo. Intente de nuevo.', 409);
  return err;
}

// ── Registrar venta ───────────────────────────────────────────────────────────
export async function registrarVenta(body, userId) {
  const items = body.items.map(({ id_producto, cantidad, nota }) => ({
    id_producto,
    cantidad,
    nota: nota ?? null,
  }));

  const pagos = body.pagos.map(({ metodo, monto, monto_recibido, referencia }) => ({
    metodo,
    monto,
    monto_recibido: monto_recibido ?? null,
     referencia: referencia ?? null,
  }));

  try {
    return await withTransaction(async (tx) => {
      // 1. Validar turno activo, pertenencia al cajero y sucursal asignada
      const turno = await repo.obtenerTurnoCaja(body.id_turno, tx);
      if (!turno || turno.estado !== 'ABIERTO') {
        throw new AppError('El turno no existe o está cerrado', 400);
      }
      if (turno.id_usuario !== userId) {
        throw new AppError('No puedes registrar ventas en el turno de otro cajero', 403);
      }
      if (!(await repo.usuarioTieneSucursal(userId, turno.id_sucursal, tx))) {
        throw new AppError('El turno pertenece a una sucursal que no tienes asignada', 403);
      }

      // 2. Si se asocia una orden, validar que exista, sea de la misma sucursal y sea facturable
      if (body.id_orden != null) {
        const orden = await repo.obtenerOrdenParaFacturar(body.id_orden, tx);
        if (!orden) {
          throw new AppError('La orden indicada no existe', 404);
        }
        if (orden.id_sucursal !== turno.id_sucursal) {
          throw new AppError('La orden pertenece a otra sucursal', 403);
        }
        if (orden.estado === 'FACTURADA' || orden.estado === 'ANULADA') {
          throw new AppError(`No se puede facturar una orden en estado ${orden.estado}`, 409);
        }
      }

      // 3. Registrar venta en BD y leer dentro de la misma transacción (tx)
      const idVenta = await repo.registrarVenta(tx, {
        idTurno: body.id_turno,
        tipo: body.tipo_comprobante,
        idCliente: body.id_cliente ?? null,
        items,
        pagos,
        descuento: body.descuento ?? '0.00',
        idOrden: body.id_orden ?? null,
      });

      return repo.obtenerVenta(idVenta, tx);
    }, userId);
  } catch (err) {
    throw mapearErrorPG(err);
  }
}

// ── Anular venta ──────────────────────────────────────────────────────────────
export async function anularVenta(idVenta, motivo, userId) {
  try {
    return await withTransaction(async (tx) => {
      const ventaActual = await repo.obtenerVenta(idVenta, tx);
      if (!ventaActual) throw new AppError('Venta no encontrada', 404);

      if (!(await repo.usuarioTieneSucursal(userId, ventaActual.id_sucursal, tx))) {
        throw new AppError('No tienes permiso para anular ventas de otra sucursal', 403);
      }

      await repo.anularVenta(tx, { idVenta, motivo, idUsuario: userId });
      return repo.obtenerVenta(idVenta, tx);
    }, userId);
  } catch (err) {
    throw mapearErrorPG(err);
  }
}

// ── Obtener detalle de venta ──────────────────────────────────────────────────
export async function obtenerVenta(idVenta, userId) {
  const venta = await repo.obtenerVenta(idVenta);
  if (!venta) throw new AppError('Venta no encontrada', 404);

  if (!(await repo.usuarioTieneSucursal(userId, venta.id_sucursal))) {
    throw new AppError('La venta pertenece a una sucursal que no tienes asignada', 403);
  }
  return venta;
}

// ── Listar ventas (filtros opcionales, restringido a sucursales del usuario) ──
export async function listarVentas({ idTurno, estado }, userId) {
  if (idTurno) {
    const turno = await repo.obtenerTurnoCaja(idTurno);
    if (!turno) throw new AppError('Turno no encontrado', 404);
    if (!(await repo.usuarioTieneSucursal(userId, turno.id_sucursal))) {
      throw new AppError('El turno pertenece a una sucursal que no tienes asignada', 403);
    }
  }
  return repo.listarVentas({ idTurno, estado, idUsuario: userId });
}