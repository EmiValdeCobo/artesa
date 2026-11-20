import { withTransaction } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import * as repo from './ordenes.repository.js';

// Transiciones válidas desde cada estado
const TRANSICIONES = {
  ABIERTA:        ['EN_PREPARACION', 'ANULADA'],
  EN_PREPARACION: ['LISTA'],   // RN: solo un pedido Nueva (ABIERTA) se puede cancelar
  LISTA:          ['ENTREGADA'],
  ENTREGADA:      [],  // la facturación pone FACTURADA automáticamente
};

// ── Crear orden ───────────────────────────────────────────────────────────────
export async function crearOrden(body, userId) {
  return withTransaction(async (tx) => {
    // 1. Verificar turno activo del usuario
    const turno = await repo.obtenerTurnoActivo(body.id_turno, userId, tx);
    if (!turno) throw new AppError('El turno no existe, no es tuyo o no está abierto', 400);

    // 2. Verificar que todos los productos existen y están activos
    const ids = body.items.map((i) => i.id_producto);
    const productos = await repo.obtenerProductosOrden(ids, tx);
    if (productos.length !== ids.length) {
      const encontrados = new Set(productos.map((p) => p.id_producto));
      const faltante = ids.find((id) => !encontrados.has(id));
      throw new AppError(`El producto con id ${faltante} no existe o está inactivo`, 400);
    }

    // 3. Armar items con el precio tomado de BD (nunca del frontend)
    const mapaPrecios = Object.fromEntries(productos.map((p) => [p.id_producto, p.precio_unitario]));
    const items = body.items.map((it) => ({
      ...it,
      precio_unitario: mapaPrecios[it.id_producto],
    }));

    // 4. Insertar orden y detalles
    const orden = await repo.insertarOrden(tx, {
      idTurno:   body.id_turno,
      canal:     body.canal,
      etiqueta:  body.etiqueta,
      idCliente: body.id_cliente ?? null,
      notas:     body.notas ?? null,
    });
    await repo.insertarDetalles(tx, orden.id_orden, items);
    return orden;
  }, userId);
}

// ── Listar órdenes ────────────────────────────────────────────────────────────
export const listarOrdenes = (filtros, userId) => repo.listarOrdenes(filtros, userId);

// ── Detalle de una orden ──────────────────────────────────────────────────────
export async function obtenerOrden(idOrden, userId) {
  const orden = await repo.obtenerOrden(idOrden, userId);
  if (!orden) throw new AppError('Orden no encontrada', 404);
  return orden;
}

// ── Editar orden (solo si ABIERTA) ───────────────────────────────────────────
export async function editarOrden(idOrden, body, userId) {
  return withTransaction(async (tx) => {
    const orden = await repo.bloquearOrden(tx, idOrden);
    if (!orden) throw new AppError('Orden no encontrada', 404);
    if (!(await repo.usuarioTieneSucursal(userId, orden.id_sucursal, tx))) {
      throw new AppError('La orden pertenece a una sucursal que no tienes asignada', 403);
    }
    if (orden.id_usuario !== userId) throw new AppError('Solo el cajero que creó la orden puede editarla', 403);
    if (orden.estado !== 'ABIERTA') {
      throw new AppError(`No se puede editar una orden en estado ${orden.estado}`, 409);
    }

    // Actualizar campos opcionales
    await repo.actualizarOrden(tx, idOrden, {
      etiqueta:   body.etiqueta,
      id_cliente: body.id_cliente,
      notas:      body.notas,
    });

    // Si vienen items, se reemplazan completos (re-toma precios de BD)
    if (body.items) {
      const ids = body.items.map((i) => i.id_producto);
      const productos = await repo.obtenerProductosOrden(ids, tx);
      if (productos.length !== ids.length) {
        const encontrados = new Set(productos.map((p) => p.id_producto));
        const faltante = ids.find((id) => !encontrados.has(id));
        throw new AppError(`El producto con id ${faltante} no existe o está inactivo`, 400);
      }
      const mapaPrecios = Object.fromEntries(productos.map((p) => [p.id_producto, p.precio_unitario]));
      const items = body.items.map((it) => ({ ...it, precio_unitario: mapaPrecios[it.id_producto] }));
      await repo.reemplazarDetalles(tx, idOrden, items);
    }

    return repo.obtenerOrden(idOrden, userId, tx);
  }, userId);
}

// ── Cambiar estado ────────────────────────────────────────────────────────────
export async function cambiarEstado(idOrden, nuevoEstado, userId) {
  return withTransaction(async (tx) => {
    const orden = await repo.bloquearOrden(tx, idOrden);
    if (!orden) throw new AppError('Orden no encontrada', 404);
    if (!(await repo.usuarioTieneSucursal(userId, orden.id_sucursal, tx))) {
      throw new AppError('La orden pertenece a una sucursal que no tienes asignada', 403);
    }

    const permitidos = TRANSICIONES[orden.estado] ?? [];
    if (!permitidos.includes(nuevoEstado)) {
      throw new AppError(`Transición inválida: ${orden.estado} → ${nuevoEstado}`, 409);
    }
    // Un pedido ya cobrado no se cancela aquí: la cola de preparación pide motivo y anula la venta.
    if (nuevoEstado === 'ANULADA' && (await repo.tieneVentaEmitida(tx, idOrden))) {
      throw new AppError('El pedido ya se cobró: cancélalo desde la cola de preparación indicando el motivo', 409);
    }

    const actualizada = await repo.actualizarEstado(tx, idOrden, nuevoEstado);
    return { ...actualizada, estado_anterior: orden.estado };
  }, userId);
}

