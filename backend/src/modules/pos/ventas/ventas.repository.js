import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const sel = (sql, bind, tx) =>
  sequelize.query(sql, { bind, transaction: tx, type: QueryTypes.SELECT });

// ── Registrar venta (llama la función SQL atómica) ────────────────────────────
// La función PL/pgSQL hace TODO: valida turno, valida CCF, calcula totales e IVA,
// genera correlativo, inserta ventas/detalles/pagos y descuenta stock.
// Nunca replicar esa lógica en JS.
export async function registrarVenta(tx, { idTurno, tipo, idCliente, items, pagos, descuento, idOrden }) {
  const rows = await sel(
    `SELECT pos.fn_registrar_venta($1::uuid, $2, $3::int, $4::jsonb, $5::jsonb, $6::numeric, $7::int) AS id_venta`,
    [
      idTurno,
      tipo,
      idCliente ?? null,
      JSON.stringify(items),
      JSON.stringify(pagos),
      descuento,
      idOrden ?? null,
    ],
    tx,
  );
  return rows[0].id_venta;
}

// ── Detalle completo de una venta ─────────────────────────────────────────────
export async function obtenerVenta(idVenta) {
  const [venta] = await sel(
    `SELECT v.id_venta, v.tipo_comprobante, v.correlativo, v.numero_control,
            v.estado, v.estado_dte, v.sello_recepcion,
            v.subtotal::text, v.descuento::text, v.iva::text, v.total::text,
            v.fecha_emision,
            v.id_turno::text, v.id_sucursal, v.id_cliente,
            c.nombre_razon_social AS cliente_nombre,
            c.nrc, c.giro_economico
     FROM pos.ventas v
     LEFT JOIN pos.clientes c ON c.id_cliente = v.id_cliente
     WHERE v.id_venta = $1::uuid`,
    [idVenta],
  );
  if (!venta) return null;

  const detalles = await sel(
    `SELECT d.id_detalle, d.id_producto, p.nombre AS nombre_producto,
            d.cantidad, d.precio_unitario::text, d.subtotal_linea::text, d.nota
     FROM pos.venta_detalles d
     JOIN inventario.productos p ON p.id_producto = d.id_producto
     WHERE d.id_venta = $1::uuid
     ORDER BY d.id_detalle`,
    [idVenta],
  );

  const pagos = await sel(
    `SELECT id_pago, metodo, monto::text, monto_recibido::text, referencia
     FROM pos.pagos
     WHERE id_venta = $1::uuid
     ORDER BY id_pago`,
    [idVenta],
  );

  return { ...venta, detalles, pagos };
}

// ── Listar ventas del turno ───────────────────────────────────────────────────
export const listarVentas = ({ idTurno, estado }) =>
  sel(
    `SELECT v.id_venta, v.tipo_comprobante, v.correlativo,
            v.total::text, v.estado, v.fecha_emision,
            c.nombre_razon_social AS cliente_nombre
     FROM pos.ventas v
     LEFT JOIN pos.clientes c ON c.id_cliente = v.id_cliente
     WHERE ($1::uuid IS NULL OR v.id_turno = $1::uuid)
       AND ($2::text IS NULL OR v.estado = $2::text)
     ORDER BY v.fecha_emision DESC`,
    [idTurno ?? null, estado ?? null],
  );

// ── Anular venta (llama la función SQL atómica y revierte stock) ─────────────
export async function anularVenta(tx, { idVenta, motivo, idUsuario }) {
  await sel(
    `SELECT pos.fn_anular_venta($1::uuid, $2::text, $3::uuid)`,
    [idVenta, motivo, idUsuario],
    tx,
  );
}