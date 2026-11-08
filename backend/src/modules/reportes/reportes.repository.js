import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

const consultar = (sql, bind) => sequelize.query(sql, { bind, type: QueryTypes.SELECT });

// Sucursales que el usuario puede ver: las asignadas en usuario_sucursal; el rol ADMIN ve todas las activas.
// $1 = id del usuario. Se antepone a cada consulta.
const VISIBLES = `
  WITH visibles AS (
    SELECT s.id_sucursal, s.nombre FROM empresa.sucursales s
    WHERE s.activa AND (
      EXISTS (SELECT 1 FROM seguridad.usuarios u JOIN seguridad.roles r ON r.id_rol = u.id_rol
              WHERE u.id_usuario = $1::uuid AND r.nombre = 'ADMIN')
      OR EXISTS (SELECT 1 FROM seguridad.usuario_sucursal us
                 WHERE us.id_usuario = $1::uuid AND us.id_sucursal = s.id_sucursal))
  )`;

// Vista reportes.vw_ventas_diarias (agrupa por nombre de sucursal). Filtra sucursal y rango de fecha.
export const ventasDiarias = (idUsuario, { desde, hasta, idSucursal }) => consultar(
  `${VISIBLES}
   SELECT v.sucursal, to_char(v.fecha, 'YYYY-MM-DD') AS fecha, v.tickets::int AS tickets,
          v.subtotal, v.iva, v.total, v.ticket_promedio
   FROM reportes.vw_ventas_diarias v
   WHERE v.sucursal IN (SELECT nombre FROM visibles WHERE $4::int IS NULL OR id_sucursal = $4::int)
     AND v.fecha BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE)
   ORDER BY v.fecha DESC, v.sucursal`,
  [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null],
);

// La vista vw_top_productos no permite filtrar por fecha ni sucursal, así que se consulta la misma
// lógica (ventas EMITIDAS) sobre las tablas base con los filtros del reporte.
export const topProductos = (idUsuario, { desde, hasta, idSucursal, limite }) => consultar(
  `${VISIBLES}
   SELECT p.nombre, SUM(d.cantidad)::int AS unidades, SUM(d.subtotal_linea) AS ingreso
   FROM pos.venta_detalles d
   JOIN pos.ventas v ON v.id_venta = d.id_venta
   JOIN inventario.productos p ON p.id_producto = d.id_producto
   WHERE v.estado = 'EMITIDA'
     AND v.id_sucursal IN (SELECT id_sucursal FROM visibles WHERE $4::int IS NULL OR id_sucursal = $4::int)
     AND v.fecha_emision::date BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE)
   GROUP BY p.id_producto, p.nombre
   ORDER BY unidades DESC, ingreso DESC, p.nombre
   LIMIT $5::int`,
  [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null, limite],
);

// Vista reportes.vw_alertas_stock: insumos en o bajo el mínimo (AGOTADO primero).
export const alertasStock = (idUsuario, { idSucursal, nivel }) => consultar(
  `${VISIBLES}
   SELECT a.sucursal, a.insumo, a.unidad, a.stock_actual, a.stock_minimo, a.faltante, a.nivel
   FROM reportes.vw_alertas_stock a
   WHERE a.sucursal IN (SELECT nombre FROM visibles WHERE $2::int IS NULL OR id_sucursal = $2::int)
     AND ($3::text IS NULL OR a.nivel = $3::text)
   ORDER BY (a.nivel = 'AGOTADO') DESC, a.faltante DESC, a.sucursal, a.insumo`,
  [idUsuario, idSucursal ?? null, nivel ?? null],
);

// Vista reportes.vw_costo_margen_producto. El margen se calcula en SQL con NUMERIC (sin IVA).
export const margenProductos = () => consultar(
  `SELECT m.id_producto, m.nombre, m.precio_venta, m.precio_sin_iva, m.costo_receta,
          m.precio_sin_iva - m.costo_receta AS margen,
          CASE WHEN m.precio_sin_iva > 0
               THEN ROUND((m.precio_sin_iva - m.costo_receta) / m.precio_sin_iva * 100, 2) END AS margen_pct
   FROM reportes.vw_costo_margen_producto m
   JOIN inventario.productos p ON p.id_producto = m.id_producto
   WHERE p.activo
   ORDER BY margen_pct ASC NULLS LAST, m.nombre`,
  [],
);
