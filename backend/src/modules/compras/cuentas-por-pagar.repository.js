import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

export const listarCuentasPorPagar = async (idUsuario, filtros = {}, periodoRecientePorDefecto = false) => {
  const { desde, hasta, idSucursal } = filtros;
  const rows = await sequelize.query(
    `WITH visibles AS (
       SELECT s.id_sucursal, s.nombre
       FROM empresa.sucursales s
       WHERE s.activa AND (
         EXISTS (
           SELECT 1 FROM seguridad.usuarios u
           JOIN seguridad.roles r ON r.id_rol = u.id_rol
           WHERE u.id_usuario = $1::uuid AND r.nombre = 'ADMIN'
         )
         OR EXISTS (
           SELECT 1 FROM seguridad.usuario_sucursal us
           WHERE us.id_usuario = $1::uuid AND us.id_sucursal = s.id_sucursal
         )
       )
     ), totales AS (
       SELECT id_compra, SUM(monto) AS pagado
       FROM compras.pagos_proveedor
       GROUP BY id_compra
     )
     SELECT f.id_compra, s.nombre AS sucursal, pr.razon_social AS proveedor,
            f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento,
            f.total::text AS total, COALESCE(t.pagado, 0)::text AS pagado,
            (f.total - COALESCE(t.pagado, 0))::text AS saldo,
            GREATEST(CURRENT_DATE - f.fecha_vencimiento, 0) AS dias_vencida,
            f.estado_pago
     FROM compras.facturas_compra f
     JOIN visibles s ON s.id_sucursal = f.id_sucursal
     JOIN compras.proveedores pr ON pr.id_proveedor = f.id_proveedor
     LEFT JOIN totales t ON t.id_compra = f.id_compra
     WHERE f.estado_pago <> 'PAGADO'
       AND (
         ($5::boolean AND f.fecha_emision BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE))
         OR
         (NOT $5::boolean AND ($2::date IS NULL OR f.fecha_emision >= $2::date)
                            AND ($3::date IS NULL OR f.fecha_emision <= $3::date))
       )
       AND ($4::int IS NULL OR f.id_sucursal = $4::int)
     ORDER BY f.fecha_vencimiento ASC, pr.razon_social, f.num_factura
     LIMIT 500`,
    {
      bind: [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null, periodoRecientePorDefecto],
      type: QueryTypes.SELECT,
    },
  );
  return rows;
};
