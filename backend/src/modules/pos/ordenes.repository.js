import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const sel  = (sql, bind, tx) => sequelize.query(sql, { bind, transaction: tx, type: QueryTypes.SELECT });
const exec = (sql, bind, tx) => sequelize.query(sql, { bind, transaction: tx, type: QueryTypes.UPDATE });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Verifica que el turno exista, pertenezca al usuario y esté ABIERTO. */
export async function obtenerTurnoActivo(idTurno, idUsuario, tx) {
  const [turno] = await sel(
    `SELECT t.id_turno, t.id_caja, t.estado, c.id_sucursal
     FROM pos.turnos_caja t
     JOIN pos.cajas c ON c.id_caja = t.id_caja
     WHERE t.id_turno = $1::uuid
       AND t.id_usuario = $2::uuid
       AND t.estado = 'ABIERTO'`,
    [idTurno, idUsuario],
    tx,
  );
  return turno ?? null;
}

/** Verifica que todos los id_producto existen y están activos. Devuelve array con precio_venta. */
export async function obtenerProductosOrden(ids, tx) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  return sel(
    `SELECT id_producto, nombre, precio_venta::text AS precio_unitario
     FROM inventario.productos
     WHERE id_producto IN (${placeholders}) AND activo = true`,
    ids,
    tx,
  );
}

// ── Crear orden con sus detalles ──────────────────────────────────────────────
export async function insertarOrden(tx, { idTurno, canal, etiqueta, idCliente, notas }) {
  const [orden] = await sel(
    `INSERT INTO pos.ordenes (id_turno, canal, etiqueta, id_cliente, estado)
     VALUES ($1::uuid, $2, $3, $4::uuid, 'ABIERTA')
     RETURNING id_orden, estado, canal, etiqueta, creado_en`,
    [idTurno, canal, etiqueta, idCliente ?? null],
    tx,
  );
  return orden;
}

export async function insertarDetalles(tx, idOrden, items) {
  // items = [{ id_producto, cantidad, nota, precio_unitario }]
  for (const it of items) {
    await exec(
      `INSERT INTO pos.orden_detalles (id_orden, id_producto, cantidad, precio_unitario, nota)
       VALUES ($1, $2, $3, $4::numeric, $5)`,
      [idOrden, it.id_producto, it.cantidad, it.precio_unitario, it.nota ?? null],
      tx,
    );
  }
}

// ── Listar órdenes activas del turno ─────────────────────────────────────────
export const listarOrdenes = ({ idTurno, estado }) => sel(
  `SELECT o.id_orden, o.canal, o.etiqueta, o.estado,
          COALESCE(SUM(d.cantidad * d.precio_unitario), 0)::text AS total,
          COUNT(d.id_detalle)::int AS items_count,
          o.creado_en
   FROM pos.ordenes o
   LEFT JOIN pos.orden_detalles d ON d.id_orden = o.id_orden
   WHERE ($1::uuid IS NULL OR o.id_turno = $1::uuid)
     AND ($2::text IS NULL OR o.estado = $2::text)
   GROUP BY o.id_orden
   ORDER BY o.creado_en`,
  [idTurno ?? null, estado ?? null],
);

// ── Detalle completo de una orden ────────────────────────────────────────────
export async function obtenerOrden(idOrden, tx) {
  const [orden] = await sel(
    `SELECT o.id_orden, o.canal, o.etiqueta, o.estado, o.notas,
            o.id_turno::text, o.id_cliente::text,
            COALESCE(SUM(d.cantidad * d.precio_unitario), 0)::text AS total,
            o.creado_en
     FROM pos.ordenes o
     LEFT JOIN pos.orden_detalles d ON d.id_orden = o.id_orden
     WHERE o.id_orden = $1
     GROUP BY o.id_orden`,
    [idOrden],
    tx,
  );
  if (!orden) return null;

  const items = await sel(
    `SELECT d.id_detalle, d.id_producto, p.nombre AS nombre_producto,
            d.cantidad, d.precio_unitario::text,
            (d.cantidad * d.precio_unitario)::text AS subtotal_linea,
            d.nota
     FROM pos.orden_detalles d
     JOIN inventario.productos p ON p.id_producto = d.id_producto
     WHERE d.id_orden = $1
     ORDER BY d.id_detalle`,
    [idOrden],
    tx,
  );
  return { ...orden, items };
}

// ── Bloquea la orden para actualización concurrente segura ───────────────────
export async function bloquearOrden(tx, idOrden) {
  const [row] = await sel(
    `SELECT o.id_orden, o.estado, o.id_turno::text,
            t.id_usuario::text, c.id_sucursal
     FROM pos.ordenes o
     JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
     JOIN pos.cajas c ON c.id_caja = t.id_caja
     WHERE o.id_orden = $1
     FOR UPDATE OF o`,
    [idOrden],
    tx,
  );
  return row ?? null;
}

// ── Editar orden: reemplaza detalles y actualiza campos ──────────────────────
export async function actualizarOrden(tx, idOrden, campos) {
  const sets = [];
  const vals = [];
  let n = 1;
  if (campos.etiqueta   !== undefined) { sets.push(`etiqueta = $${n++}`);   vals.push(campos.etiqueta); }
  if (campos.id_cliente !== undefined) { sets.push(`id_cliente = $${n++}::uuid`); vals.push(campos.id_cliente); }
  if (campos.notas      !== undefined) { sets.push(`notas = $${n++}`);      vals.push(campos.notas); }
  if (sets.length) {
    vals.push(idOrden);
    await exec(
      `UPDATE pos.ordenes SET ${sets.join(', ')} WHERE id_orden = $${n}`,
      vals,
      tx,
    );
  }
}

export async function reemplazarDetalles(tx, idOrden, items) {
  await exec('DELETE FROM pos.orden_detalles WHERE id_orden = $1', [idOrden], tx);
  await insertarDetalles(tx, idOrden, items);
}

// ── Cambiar estado ────────────────────────────────────────────────────────────
export async function actualizarEstado(tx, idOrden, estado) {
  const [row] = await sel(
    `UPDATE pos.ordenes SET estado = $2 WHERE id_orden = $1
     RETURNING id_orden, estado`,
    [idOrden, estado],
    tx,
  );
  return row;
}

