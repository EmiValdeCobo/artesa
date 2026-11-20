import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const select = (sql, bind, transaction) => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });

// Misma regla de alcance que CxP: ADMIN ve todas las sucursales activas; el resto, las asignadas.
const SUCURSAL_VISIBLE = `(
  EXISTS (SELECT 1 FROM seguridad.usuarios u JOIN seguridad.roles r ON r.id_rol = u.id_rol
          WHERE u.id_usuario = $2::uuid AND r.nombre = 'ADMIN')
  OR EXISTS (SELECT 1 FROM seguridad.usuario_sucursal us
             WHERE us.id_usuario = $2::uuid AND us.id_sucursal = f.id_sucursal)
)`;

export const obtenerEncabezado = async (idCompra, idUsuario, transaction) => {
  const rows = await select(
    `SELECT f.id_compra, f.num_factura, f.tipo_costo, f.tipo_documento, f.condicion_pago,
            to_char(f.fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
            to_char(f.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
            f.subtotal::text AS subtotal, f.iva_credito::text AS iva, f.total::text AS total,
            f.estado_pago, GREATEST(CURRENT_DATE - f.fecha_vencimiento, 0) AS dias_vencida,
            f.id_sucursal, s.nombre AS sucursal, pr.id_proveedor, pr.razon_social AS proveedor, pr.tipo AS tipo_proveedor
     FROM compras.facturas_compra f
     JOIN empresa.sucursales s ON s.id_sucursal = f.id_sucursal
     JOIN compras.proveedores pr ON pr.id_proveedor = f.id_proveedor
     WHERE f.id_compra = $1::uuid AND f.deleted_at IS NULL AND ${SUCURSAL_VISIBLE}`,
    [idCompra, idUsuario],
    transaction,
  );
  return rows[0] ?? null;
};

// subtotal es sin IVA; total = cantidad × costo con IVA (redondeado por línea, igual que fn_registrar_compra).
// Históricos (antes de la migración 017) no guardan el costo con IVA: se reparte el IVA del
// encabezado en proporción al subtotal de la línea; la suma puede diferir por un centavo.
export const listarLineas = (idCompra, transaction) => select(
  `SELECT id_detalle, id_insumo, concepto, unidad, cantidad::text AS cantidad, costo_unitario::text AS costo_unitario,
          subtotal::text AS subtotal, (total - subtotal)::text AS iva, total::text AS total
   FROM (
     SELECT d.id_detalle, d.id_insumo, COALESCE(i.nombre, d.descripcion) AS concepto, um.codigo AS unidad,
            d.cantidad, d.subtotal,
            COALESCE(d.costo_unitario_con_iva, ROUND(d.costo_unitario * f.total / NULLIF(f.subtotal, 0), 6)) AS costo_unitario,
            COALESCE(ROUND(d.cantidad * d.costo_unitario_con_iva, 2),
                     d.subtotal + ROUND(d.subtotal * f.iva_credito / NULLIF(f.subtotal, 0), 2)) AS total
     FROM compras.compra_detalles d
     JOIN compras.facturas_compra f ON f.id_compra = d.id_compra
     LEFT JOIN inventario.insumos i ON i.id_insumo = d.id_insumo
   LEFT JOIN inventario.unidades_medida um ON um.id_unidad = i.id_unidad_base
     WHERE d.id_compra = $1::uuid
   ) l
   ORDER BY id_detalle`,
  [idCompra],
  transaction,
);

export const listarAbonos = (idCompra, transaction) => select(
  `SELECT id_pago, to_char(fecha_pago, 'YYYY-MM-DD') AS fecha_pago, monto::text AS monto, metodo, referencia
   FROM compras.pagos_proveedor
   WHERE id_compra = $1::uuid AND deleted_at IS NULL
   ORDER BY fecha_pago, id_pago`,
  [idCompra],
  transaction,
);

export const resumenPagos = async (idCompra, transaction) => {
  const rows = await select(
    `SELECT COALESCE(SUM(monto), 0)::text AS pagado,
            (f.total - COALESCE(SUM(p.monto), 0))::text AS saldo
     FROM compras.facturas_compra f
     LEFT JOIN compras.pagos_proveedor p ON p.id_compra = f.id_compra AND p.deleted_at IS NULL
     WHERE f.id_compra = $1::uuid
     GROUP BY f.total`,
    [idCompra],
    transaction,
  );
  return rows[0];
};

export const eliminarFactura = (idCompra, idUsuario, motivo, transaction) => select(
  'SELECT compras.fn_eliminar_factura($1::uuid, $2::uuid, $3::varchar) AS ok',
  [idCompra, idUsuario, motivo ?? null],
  transaction,
);
