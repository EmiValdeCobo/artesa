import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const select = (sql, bind, transaction) => sequelize.query(sql, {
  bind,
  transaction,
  type: QueryTypes.SELECT,
});

export const buscarProveedor = async (idProveedor, transaction) => {
  const rows = await select(
    `SELECT id_proveedor, activo, deleted_at, tipo
     FROM compras.proveedores
     WHERE id_proveedor = $1
     FOR UPDATE`,
    [idProveedor],
    transaction,
  );
  return rows[0] ?? null;
};

export const buscarSucursal = async (idSucursal, transaction) => {
  const rows = await select(
    `SELECT id_sucursal, activa, deleted_at
     FROM empresa.sucursales
     WHERE id_sucursal = $1
     FOR UPDATE`,
    [idSucursal],
    transaction,
  );
  return rows[0] ?? null;
};

export const buscarInsumos = (idsInsumo, transaction) => select(
  `SELECT id_insumo, activo, deleted_at
   FROM inventario.insumos
   WHERE id_insumo = ANY($1::int[])
   ORDER BY id_insumo
   FOR UPDATE`,
  [idsInsumo],
  transaction,
);

export const registrarCompra = async (datos, idUsuario, transaction) => {
  const items = datos.items.map((item) => (datos.tipoCosto === 'GASTO'
    ? {
      id_insumo: null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      costo_unitario: item.costoUnitario,
    }
    : {
      id_insumo: item.idInsumo,
      cantidad: item.cantidad,
      costo_unitario: item.costoUnitario,
    }));
  const rows = await select(
    `SELECT compras.fn_registrar_compra(
       $1::int, $2::int, $3::varchar, $4::date, $5::varchar,
       $6::jsonb, $7::uuid, $8::varchar, $9::varchar
     ) AS id_compra`,
    [
      datos.idProveedor,
      datos.idSucursal,
      datos.numeroFactura,
      datos.fechaEmision,
      datos.condicionPago,
      JSON.stringify(items),
      idUsuario,
      datos.tipoCosto,
      datos.tipoDocumento ?? 'CCF',
    ],
    transaction,
  );
  return rows[0]?.id_compra;
};

export const obtenerCompra = async (idCompra, transaction) => {
  const rows = await select(
    `SELECT total::text AS total, estado_pago
     FROM compras.facturas_compra
     WHERE id_compra = $1::uuid
     FOR UPDATE`,
    [idCompra],
    transaction,
  );
  return rows[0] ?? null;
};

export const insertarPagoContado = async (idCompra, idUsuario, transaction) => {
  const rows = await select(
    `INSERT INTO compras.pagos_proveedor
       (id_compra, fecha_pago, monto, metodo, referencia, id_usuario)
     SELECT id_compra, CURRENT_DATE, total, 'EFECTIVO', NULL, $2::uuid
     FROM compras.facturas_compra
     WHERE id_compra = $1::uuid
     RETURNING id_pago`,
    [idCompra, idUsuario],
    transaction,
  );
  return rows[0]?.id_pago;
};

export const obtenerEstadoPago = async (idCompra, transaction) => {
  const rows = await select(
    'SELECT estado_pago FROM compras.facturas_compra WHERE id_compra = $1::uuid',
    [idCompra],
    transaction,
  );
  return rows[0]?.estado_pago;
};

export const usuarioTienePermiso = async (idUsuario, codigo, transaction) => {
  const rows = await select('SELECT seguridad.fn_tiene_permiso($1::uuid, $2) AS tiene', [idUsuario, codigo], transaction);
  return rows[0]?.tiene === true;
};

// Productos cuyo margen quedó bajo el mínimo y que usan alguno de los insumos comprados
// (por receta o como insumo de reventa). Se lee dentro de la misma transacción para ver
// el costo promedio ya recalculado por el trigger de la compra.
export const alertasMargenPorInsumos = (idsInsumo, transaction) => select(
  `SELECT v.id_producto AS "idProducto", v.nombre,
          v.precio_sin_iva::text AS "precioSinIva", v.costo_receta::text AS "costoReceta",
          v.margen_pct::text AS "margenPct", v.margen_minimo_pct::text AS "margenMinimoPct"
   FROM reportes.vw_productos_margen_bajo v
   JOIN inventario.productos p ON p.id_producto = v.id_producto
   WHERE p.id_insumo_reventa = ANY($1::int[])
      OR EXISTS (SELECT 1 FROM inventario.recetas r
                 WHERE r.id_producto = v.id_producto AND r.id_insumo = ANY($1::int[]))
   ORDER BY v.margen_pct ASC, v.nombre`,
  [idsInsumo],
  transaction,
);
