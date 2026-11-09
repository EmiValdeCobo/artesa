import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';
import { UsuarioSucursal } from '../../models/index.js';

const consultar = (sql, bind, transaction = null) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });

// Cola: órdenes aún no entregadas, de las sucursales del usuario, la más antigua primero.
// Los productos de cada orden viajan agregados en `items` (una fila por orden).
export const listarCola = (idUsuario, { idSucursal }) => consultar(
  `SELECT o.id_orden, o.estado, o.canal, o.etiqueta, o.creado_en, s.id_sucursal, s.nombre AS sucursal,
          GREATEST(0, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP::timestamp - o.creado_en)) / 60)::int AS minutos_espera,
          COALESCE(json_agg(json_build_object('id_detalle', d.id_detalle, 'producto', p.nombre,
                                              'cantidad', d.cantidad, 'nota', d.nota) ORDER BY d.id_detalle)
                   FILTER (WHERE d.id_detalle IS NOT NULL), '[]'::json) AS items
   FROM pos.ordenes o
   JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
   JOIN pos.cajas c ON c.id_caja = t.id_caja
   JOIN empresa.sucursales s ON s.id_sucursal = c.id_sucursal
   LEFT JOIN pos.orden_detalles d ON d.id_orden = o.id_orden
   LEFT JOIN inventario.productos p ON p.id_producto = d.id_producto
   WHERE o.estado IN ('ABIERTA', 'EN_PREPARACION', 'LISTA')
     AND c.id_sucursal IN (SELECT id_sucursal FROM seguridad.usuario_sucursal WHERE id_usuario = $1::uuid)
     AND ($2::int IS NULL OR c.id_sucursal = $2::int)
   GROUP BY o.id_orden, s.id_sucursal, s.nombre
   ORDER BY o.creado_en, o.id_orden`,
  [idUsuario, idSucursal ?? null],
);

// Bloquea la orden mientras dure la transacción: dos baristas no pueden avanzarla a la vez.
export async function bloquearOrden(transaction, idOrden) {
  const [orden] = await consultar(
    `SELECT o.id_orden, o.estado, c.id_sucursal
     FROM pos.ordenes o
     JOIN pos.turnos_caja t ON t.id_turno = o.id_turno
     JOIN pos.cajas c ON c.id_caja = t.id_caja
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

export async function actualizarEstado(transaction, idOrden, estado) {
  const [orden] = await consultar(
    'UPDATE pos.ordenes SET estado = $2::text WHERE id_orden = $1::int RETURNING id_orden, estado',
    [idOrden, estado],
    transaction,
  );
  return orden;
}
