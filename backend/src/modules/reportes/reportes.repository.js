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

// Replica la vista diaria incluyendo id_sucursal: la vista agrupa por nombre y los nombres
// no son UNIQUE, por lo que usarla aquí podría mezclar sucursales distintas con igual etiqueta.
export const ventasDiarias = (idUsuario, { desde, hasta, idSucursal }) => consultar(
  `${VISIBLES}
   SELECT s.id_sucursal, s.nombre AS sucursal, to_char(v.fecha_emision::date, 'YYYY-MM-DD') AS fecha,
          COUNT(*)::int AS tickets, SUM(v.subtotal) AS subtotal, SUM(v.iva) AS iva, SUM(v.total) AS total,
          ROUND(AVG(v.total), 2) AS ticket_promedio
   FROM pos.ventas v
   JOIN visibles s ON s.id_sucursal = v.id_sucursal
   WHERE v.estado = 'EMITIDA'
     AND ($4::int IS NULL OR s.id_sucursal = $4::int)
     AND v.fecha_emision::date BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE)
   GROUP BY s.id_sucursal, s.nombre, v.fecha_emision::date
   ORDER BY v.fecha_emision::date DESC, s.nombre, s.id_sucursal`,
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

// Replica vw_alertas_stock conservando id_sucursal para evitar cruces por nombres repetidos.
export const alertasStock = (idUsuario, { idSucursal, nivel }) => consultar(
  `${VISIBLES}
   SELECT s.id_sucursal, s.nombre AS sucursal, i.nombre AS insumo, u.codigo AS unidad,
          ss.stock_actual, ss.stock_minimo, ss.stock_minimo - ss.stock_actual AS faltante,
          CASE WHEN ss.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END AS nivel
   FROM inventario.stock_sucursal ss
   JOIN visibles s ON s.id_sucursal = ss.id_sucursal
   JOIN inventario.insumos i ON i.id_insumo = ss.id_insumo
   JOIN inventario.unidades_medida u ON u.id_unidad = i.id_unidad_base
   WHERE i.activo AND ss.stock_actual <= ss.stock_minimo
     AND ($2::int IS NULL OR s.id_sucursal = $2::int)
     AND ($3::text IS NULL OR CASE WHEN ss.stock_actual <= 0 THEN 'AGOTADO' ELSE 'BAJO_MINIMO' END = $3::text)
   ORDER BY (ss.stock_actual <= 0) DESC, ss.stock_minimo - ss.stock_actual DESC, s.nombre, s.id_sucursal, i.nombre`,
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

// Cuadres por turno: la vista ya contiene los importes calculados; el JOIN aporta fecha,
// nombre de caja y usuario. La sucursal se filtra antes de devolver cualquier registro.
export const cuadreTurnos = (idUsuario, { desde, hasta, idSucursal }) => consultar(
  `${VISIBLES}
   SELECT q.id_turno, s.nombre AS sucursal, c.nombre_identificador AS caja, u.username AS usuario,
          q.estado, t.abierto_en, t.cerrado_en,
          q.monto_apertura, q.ventas_efectivo, q.ventas_tarjeta, q.ventas_digital,
          q.ingresos_caja, q.egresos_caja,
          q.esperado_efectivo, q.esperado_tarjeta, q.esperado_digital,
          q.monto_cierre_efectivo, q.monto_cierre_pos_tarjeta, q.monto_cierre_digital,
          q.dif_efectivo, q.dif_tarjeta, q.dif_digital
   FROM reportes.vw_cuadre_turno q
   JOIN pos.turnos_caja t ON t.id_turno = q.id_turno
   JOIN pos.cajas c ON c.id_caja = q.id_caja
   JOIN empresa.sucursales s ON s.id_sucursal = q.id_sucursal
   JOIN seguridad.usuarios u ON u.id_usuario = q.id_usuario
   WHERE q.id_sucursal IN (SELECT id_sucursal FROM visibles WHERE $4::int IS NULL OR id_sucursal = $4::int)
     AND t.abierto_en >= COALESCE($2::date, CURRENT_DATE - 29)
     AND t.abierto_en < (COALESCE($3::date, CURRENT_DATE) + INTERVAL '1 day')
   ORDER BY t.abierto_en DESC, q.id_turno
   LIMIT 500`,
  [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null],
);

// La vista vw_cuentas_por_pagar no expone id_sucursal. Se replica su agregación sobre
// tablas base para poder aplicar el alcance de usuario_sucursal sin filtrar por nombres.
export const cuentasPorPagar = (idUsuario, { desde, hasta, idSucursal }) => consultar(
  `${VISIBLES}
   SELECT f.id_compra, s.nombre AS sucursal, pr.razon_social AS proveedor,
          f.num_factura, f.tipo_costo, f.fecha_emision, f.fecha_vencimiento,
          f.total, COALESCE(SUM(pp.monto), 0) AS pagado,
          f.total - COALESCE(SUM(pp.monto), 0) AS saldo,
          GREATEST(CURRENT_DATE - f.fecha_vencimiento, 0) AS dias_vencida,
          f.estado_pago
   FROM compras.facturas_compra f
   JOIN visibles s ON s.id_sucursal = f.id_sucursal
   JOIN compras.proveedores pr ON pr.id_proveedor = f.id_proveedor
   LEFT JOIN compras.pagos_proveedor pp ON pp.id_compra = f.id_compra
   WHERE f.estado_pago <> 'PAGADO'
     AND f.fecha_emision BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE)
     AND ($4::int IS NULL OR f.id_sucursal = $4::int)
   GROUP BY f.id_compra, s.nombre, pr.razon_social
   ORDER BY f.fecha_vencimiento ASC, pr.razon_social, f.num_factura
   LIMIT 500`,
  [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null],
);

// Distribución del ingreso emitido por método de pago; cada ticket puede aparecer en
// más de un método cuando se registró un cobro mixto.
export const ventasPorMetodoPago = (idUsuario, { desde, hasta, idSucursal }) => consultar(
  `${VISIBLES}
   SELECT p.metodo, COUNT(DISTINCT v.id_venta)::int AS tickets,
          SUM(p.monto) AS total
   FROM pos.pagos p
   JOIN pos.ventas v ON v.id_venta = p.id_venta
   WHERE v.estado = 'EMITIDA'
     AND v.id_sucursal IN (SELECT id_sucursal FROM visibles WHERE $4::int IS NULL OR id_sucursal = $4::int)
     AND v.fecha_emision::date BETWEEN COALESCE($2::date, CURRENT_DATE - 29) AND COALESCE($3::date, CURRENT_DATE)
   GROUP BY p.metodo
   ORDER BY SUM(p.monto) DESC, p.metodo`,
  [idUsuario, desde ?? null, hasta ?? null, idSucursal ?? null],
);
