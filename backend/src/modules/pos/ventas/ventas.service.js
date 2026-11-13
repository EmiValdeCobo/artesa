import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './ventas.repository.js';

// ── Mapeo de errores PostgreSQL P0001 → AppError HTTP ────────────────────────
// La función SQL lanza RAISE EXCEPTION con mensajes en español.
// Los capturamos aquí para devolver el código HTTP adecuado.
function mapearErrorPG(err) {
  const msg = err.message ?? '';
  if (err.code === 'P0001') {
    if (msg.includes('turno no existe') || msg.includes('está cerrado')) return new AppError(msg, 400);
    if (msg.includes('CCF requiere cliente'))                              return new AppError(msg, 400);
    if (msg.includes('no cuadran'))                                        return new AppError(msg, 400);
    if (msg.includes('inexistentes') || msg.includes('inactivos'))        return new AppError(msg, 400);
    if (msg.includes('descuento no puede superar'))                        return new AppError(msg, 400);
    if (msg.includes('no tiene productos'))                                return new AppError(msg, 400);
    // Cualquier otra excepción de negocio → 400 genérico
    return new AppError(msg, 400);
  }
  // Violación de restricción única (correlativo duplicado, race condition)
  if (err.code === '23505') return new AppError('Conflicto al generar el correlativo. Intente de nuevo.', 409);
  return err; // deja que el errorHandler global lo maneje
}

// ── Registrar venta ───────────────────────────────────────────────────────────
export async function registrarVenta(body, userId) {
  // Transformamos montos de string "0.00" a número solo para el bind de PostgreSQL.
  // La función SQL recibe NUMERIC; el cast se hace en el bind ::numeric, no en JS.
  const items = body.items.map(({ id_producto, cantidad, nota }) => ({
    id_producto,
    cantidad,
    nota: nota ?? null,
  }));

  const pagos = body.pagos.map(({ metodo, monto, monto_recibido, referencia }) => ({
    metodo,
    monto,                           // string "0.00" → PostgreSQL lo castea a NUMERIC via ::jsonb
    monto_recibido: monto_recibido ?? null,
    referencia:     referencia ?? null,
  }));

  try {
    return await withTransaction(async (tx) => {
      const idVenta = await repo.registrarVenta(tx, {
        idTurno:   body.id_turno,
        tipo:      body.tipo_comprobante,
        idCliente: body.id_cliente ?? null,
        items,
        pagos,
        descuento: body.descuento ?? '0.00',
        idOrden:   body.id_orden ?? null,
      });

      // Devuelve el detalle completo recién creado
      return repo.obtenerVenta(idVenta);
    }, userId);
  } catch (err) {
    throw mapearErrorPG(err);
  }
}

// ── Obtener detalle de venta ──────────────────────────────────────────────────
export async function obtenerVenta(idVenta) {
  const venta = await repo.obtenerVenta(idVenta);
  if (!venta) throw new AppError('Venta no encontrada', 404);
  return venta;
}

// ── Listar ventas (filtros opcionales) ───────────────────────────────────────
export const listarVentas = (filtros) => repo.listarVentas(filtros);

