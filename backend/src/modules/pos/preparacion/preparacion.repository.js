import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';
import { UsuarioSucursal } from '../../../models/index.js';

const consultar = (sql, bind, transaction = null) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });

// Cola: órdenes aún no entregadas, de las sucursales ASIGNADAS al usuario (seguridad.usuario_sucursal):
// el ADMIN tiene todas; cajero/barista solo la suya. El filtro idSucursal solo puede reducir ese alcance.
// No se filtra por turno abierto: un pedido de un turno ya cerrado (huérfano) sigue visible hasta entregarse.
// Los minutos se calculan en la BD (misma zona que creado_en) para no depender del reloj del navegador.
export const listarCola = (idUsuario, { idSucursal }, transaction = null) => consultar(
  `SELECT o.id_orden, o.estado, o.canal, o.etiqueta, o.creado_en, s.id_sucursal, s.nombre AS sucursal,
          c.nombre_identificador AS caja, (t.estado = 'ABIERTO') AS turno_abierto,
          EXISTS (SELECT 1 FROM pos.ventas v WHERE v.id_orden = o.id_orden AND v.estado = 'EMITIDA') AS pagada,
          GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP::timestamp - o.creado_en)) / 60)::int AS minutos_espera,
          COALESCE(json_agg(json_build_object('id_detalle', d.id_detalle, 'id_producto', d.id_producto, 'producto', p.nombre,
                                              'es_elaborado', p.es_elaborado, 'id_detalle_padre', d.id_detalle_padre,
                                              'cantidad', d.cantidad, 'nota', d.nota) ORDER BY d.id_detalle)
                   FILTER (WHERE d.id_detalle IS NOT NULL), '[]'::json) AS items
   FROM pos.ordenes o
   JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
   JOIN pos.cajas c ON c.id_caja = o.id_caja
   JOIN empresa.sucursales s ON s.id_sucursal = o.id_sucursal
   LEFT JOIN pos.orden_detalles d ON d.id_orden = o.id_orden
   LEFT JOIN inventario.productos p ON p.id_producto = d.id_producto
   WHERE o.estado IN ('ABIERTA', 'EN_PREPARACION', 'LISTA')
     AND o.id_sucursal IN (SELECT id_sucursal FROM seguridad.usuario_sucursal WHERE id_usuario = $1::uuid)
     AND ($2::int IS NULL OR o.id_sucursal = $2::int)
   GROUP BY o.id_orden, s.id_sucursal, s.nombre, c.nombre_identificador, t.estado
   ORDER BY o.creado_en, o.id_orden`,
  [idUsuario, idSucursal ?? null],
  transaction,
);

// Bloquea la orden mientras dure la transacción: dos baristas no pueden avanzarla a la vez.
export async function bloquearOrden(transaction, idOrden) {
  const [orden] = await consultar(
    `SELECT o.id_orden, o.estado, o.id_sucursal
     FROM pos.ordenes o
     WHERE o.id_orden = $1::int
     FOR UPDATE OF o`,
    [idOrden],
    transaction,
  );
  return orden ?? null;
}

export const usuarioTieneSucursal = async (idUsuario, idSucursal, transaction) => (
  (await UsuarioSucursal.count({ where: { id_usuario: idUsuario, id_sucursal: idSucursal }, transaction })) > 0
);

export async function usuarioTienePermiso(idUsuario, codigo) {
  const [fila] = await consultar('SELECT seguridad.fn_tiene_permiso($1::uuid, $2) AS tiene', [idUsuario, codigo]);
  return fila.tiene === true;
}

export async function actualizarEstado(transaction, idOrden, estado) {
  const [orden] = await consultar(
    'UPDATE pos.ordenes SET estado = $2::text WHERE id_orden = $1::int RETURNING id_orden, estado',
    [idOrden, estado],
    transaction,
  );
  return orden;
}

// Venta EMITIDA ligada a la orden (pago anticipado del POS), si existe.
export async function ventaEmitidaDeOrden(transaction, idOrden) {
  const [venta] = await consultar(
    `SELECT id_venta::text FROM pos.ventas WHERE id_orden = $1::int AND estado = 'EMITIDA' FOR UPDATE`,
    [idOrden],
    transaction,
  );
  return venta ?? null;
}

// Pedido cobrado: se anula la venta con la función SQL (revierte stock y anula la orden ligada).
export const anularVentaDeOrden = (transaction, { idVenta, motivo, idUsuario }) => consultar(
  'SELECT pos.fn_anular_venta($1::uuid, $2::text, $3::uuid)',
  [idVenta, motivo, idUsuario],
  transaction,
);

// Pedido sin cobrar: solo sale de la cola.
export async function anularOrden(transaction, idOrden, motivo) {
  const [orden] = await consultar(
    `UPDATE pos.ordenes SET estado = 'ANULADA', motivo_anulacion = $2::text
     WHERE id_orden = $1::int RETURNING id_orden, estado`,
    [idOrden, motivo],
    transaction,
  );
  return orden;
}
