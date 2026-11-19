import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const CTE_VISIBLES = `
  WITH visibles AS (
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
  )`;

const FILTROS_CXP = `
  ($6::text = 'pendientes' AND f.estado_pago IN ('PENDIENTE', 'PARCIAL'))
  OR ($6::text = 'pagadas' AND f.estado_pago = 'PAGADO')
  OR $6::text = 'todas'
`;

const FILTROS_FECHA = `
  (($5::boolean AND f.fecha_emision BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE))
   OR
   (NOT $5::boolean AND ($2::date IS NULL OR f.fecha_emision >= $2::date)
                      AND ($3::date IS NULL OR f.fecha_emision <= $3::date))
  )
  AND ($4::int IS NULL OR f.id_sucursal = $4::int)
`;

const CONTAR_CXP = `${CTE_VISIBLES}
  SELECT COUNT(*)::text AS total
  FROM compras.facturas_compra f
  JOIN visibles s ON s.id_sucursal = f.id_sucursal
  WHERE (${FILTROS_CXP}) AND ${FILTROS_FECHA}
    AND ($7::text IS NULL OR f.tipo_costo = $7::text)`;

export const listarCuentasPorPagar = async (idUsuario, opciones) => {
  const {
    desde, hasta, idSucursal, tipoCosto, estado = 'pendientes', page = 1, limit = 50,
    periodoRecientePorDefecto = false,
  } = opciones;
  const binds = [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null, periodoRecientePorDefecto, estado, tipoCosto ?? null];
  const rows = await sequelize.query(
    `${CTE_VISIBLES}, totales AS (
       SELECT id_compra, SUM(monto) AS pagado
       FROM compras.pagos_proveedor
       GROUP BY id_compra
     )
     SELECT f.id_compra, s.nombre AS sucursal, pr.razon_social AS proveedor,
            f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento,
            f.total::text AS total, COALESCE(t.pagado, 0)::text AS pagado,
            CASE WHEN f.estado_pago = 'PAGADO' THEN 0.00::numeric
                 ELSE f.total - COALESCE(t.pagado, 0) END::text AS saldo,
            GREATEST(CURRENT_DATE - f.fecha_vencimiento, 0) AS dias_vencida,
            f.estado_pago, COUNT(*) OVER()::text AS __total
     FROM compras.facturas_compra f
     JOIN visibles s ON s.id_sucursal = f.id_sucursal
     JOIN compras.proveedores pr ON pr.id_proveedor = f.id_proveedor
     LEFT JOIN totales t ON t.id_compra = f.id_compra
     WHERE (${FILTROS_CXP}) AND ${FILTROS_FECHA}
       AND ($7::text IS NULL OR f.tipo_costo = $7::text)
     ORDER BY f.fecha_vencimiento ASC, pr.razon_social, f.num_factura, f.id_compra
     LIMIT $8::int OFFSET $9::int`,
    {
      bind: [...binds, limit, (page - 1) * limit],
      type: QueryTypes.SELECT,
    },
  );
  const total = rows.length
    ? Number(rows[0].__total)
    : Number((await sequelize.query(CONTAR_CXP, { bind: binds, type: QueryTypes.SELECT }))[0].total);
  return { data: rows.map(({ __total: _total, ...factura }) => factura), pagination: { page, limit, total } };
};
