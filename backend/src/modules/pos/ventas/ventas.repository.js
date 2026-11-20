import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';
import { UsuarioSucursal } from '../../../models/index.js';

export { sequelize };

const sel = (sql, bind, tx = null) =>
  sequelize.query(sql, { bind, transaction: tx, type: QueryTypes.SELECT });

/** Verifica si el usuario tiene asignada la sucursal indicada */
export const usuarioTieneSucursal = async (idUsuario, idSucursal, tx = null) =>
  (await UsuarioSucursal.count({
    where: { id_usuario: idUsuario, id_sucursal: idSucursal },
    transaction: tx,
  })) > 0;

/** Obtiene el turno y su sucursal para validar pertenencia y estado */
export async function obtenerTurnoCaja(idTurno, tx = null) {
  const [turno] = await sel(
    `SELECT t.id_turno::text, t.id_usuario::text, t.estado, c.id_sucursal
     FROM pos.turnos_caja t
     JOIN pos.cajas c ON c.id_caja = t.id_caja
     WHERE t.id_turno = $1::uuid`,
    [idTurno],
    tx,
  );
  return turno ?? null;
}

/** Obtiene una orden bloqueándola para validar que se pueda facturar */
export async function obtenerOrdenParaFacturar(idOrden, tx = null) {
  const [orden] = await sel(
    `SELECT o.id_orden, o.estado, o.id_turno::text, c.id_sucursal
     FROM pos.ordenes o
     JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
     JOIN pos.cajas c ON c.id_caja = t.id_caja
     WHERE o.id_orden = $1::int
     FOR UPDATE OF o`,
    [idOrden],
    tx,
  );
  return orden ?? null;
}

// ── Registrar venta (llama la función SQL atómica) ────────────────────────────
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

// ── Detalle completo de una venta (soporta transacción tx) ────────────────────
export async function obtenerVenta(idVenta, tx = null) {
  const [venta] = await sel(
    `SELECT v.id_venta, v.tipo_comprobante, v.correlativo, v.numero_control,
            v.codigo_generacion::text, v.estado, v.estado_dte, v.sello_recepcion,
            v.subtotal::text, v.descuento::text, v.iva::text, v.total::text,
            v.motivo_anulacion, v.fecha_emision,
            v.id_turno::text, v.id_sucursal, v.id_cliente, v.id_usuario::text,
            s.nombre AS sucursal_nombre,
            s.direccion AS sucursal_direccion,
            s.departamento AS sucursal_departamento,
            s.telefono AS sucursal_telefono,
            u.username AS cajero_username,
            c.nombre_razon_social AS cliente_nombre,
            c.tipo_documento AS cliente_tipo_documento,
            c.num_documento AS cliente_num_documento,
            c.nrc, c.giro_economico,
            c.direccion AS cliente_direccion
     FROM pos.ventas v
     JOIN empresa.sucursales s ON s.id_sucursal = v.id_sucursal
     JOIN seguridad.usuarios u ON u.id_usuario = v.id_usuario
     LEFT JOIN pos.clientes c ON c.id_cliente = v.id_cliente
     WHERE v.id_venta = $1::uuid`,
    [idVenta],
    tx,
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
    tx,
  );

  const pagos = await sel(
    `SELECT id_pago, metodo, monto::text, monto_recibido::text, referencia,
            simulado, marca_tarjeta, ultimos4
     FROM pos.pagos
     WHERE id_venta = $1::uuid
     ORDER BY id_pago`,
    [idVenta],
    tx,
  );

  return { ...venta, detalles, pagos };
}

// ── Listar ventas (solo de las sucursales asignadas al usuario) ───────────────
export const listarVentas = ({ idTurno, estado, idUsuario }) =>
  sel(
    `SELECT v.id_venta, v.tipo_comprobante, v.correlativo,
            v.total::text, v.estado, v.fecha_emision,
            v.id_sucursal, v.id_turno::text,
            c.nombre_razon_social AS cliente_nombre,
            u.username AS cajero_username,
            s.nombre AS sucursal_nombre
     FROM pos.ventas v
     JOIN seguridad.usuarios u ON u.id_usuario = v.id_usuario
     JOIN empresa.sucursales s ON s.id_sucursal = v.id_sucursal
     LEFT JOIN pos.clientes c ON c.id_cliente = v.id_cliente
     WHERE v.id_sucursal IN (
       SELECT id_sucursal FROM seguridad.usuario_sucursal WHERE id_usuario = $3::uuid
     )
       AND ($1::uuid IS NULL OR v.id_turno = $1::uuid)
       AND ($2::text IS NULL OR v.estado = $2::text)
     ORDER BY v.fecha_emision DESC`,
    [idTurno ?? null, estado ?? null, idUsuario],
  );

// ── Anular venta (llama la función SQL atómica y revierte stock) ─────────────
export async function anularVenta(tx, { idVenta, motivo, idUsuario }) {
  await sel(
    `SELECT pos.fn_anular_venta($1::uuid, $2::text, $3::uuid)`,
    [idVenta, motivo, idUsuario],
    tx,
  );
}