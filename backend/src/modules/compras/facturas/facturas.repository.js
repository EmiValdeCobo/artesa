import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const select = (sql, bind, transaction) => sequelize.query(sql, {
  bind,
  transaction,
  type: QueryTypes.SELECT,
});

export const buscarProveedor = async (idProveedor, transaction) => {
  const rows = await select(
    `SELECT id_proveedor, activo, deleted_at
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
       $6::jsonb, $7::uuid, $8::varchar
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
    ],
    transaction,
  );
  return rows[0]?.id_compra;
};
