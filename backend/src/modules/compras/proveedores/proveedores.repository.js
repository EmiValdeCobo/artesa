import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const select = (sql, bind = [], transaction) => sequelize.query(sql, {
  bind,
  transaction,
  type: QueryTypes.SELECT,
});

const campos = 'id_proveedor, razon_social, nrc, nit, contacto, telefono, dias_credito, activo, modificado_en';

export const listarProveedores = (activo) => select(
  `SELECT ${campos} FROM compras.proveedores
   WHERE deleted_at IS NULL AND ($1::boolean IS NULL OR activo = $1)
   ORDER BY razon_social ASC, id_proveedor ASC`,
  [activo ?? null],
);

export const buscarProveedor = async (id, transaction) => {
  const rows = await select(
    `SELECT ${campos}, deleted_at FROM compras.proveedores WHERE id_proveedor = $1 FOR UPDATE`,
    [id],
    transaction,
  );
  return rows[0] ?? null;
};

export const crearProveedor = async (datos, transaction) => {
  const rows = await select(
    `INSERT INTO compras.proveedores (razon_social, nrc, nit, contacto, telefono, dias_credito)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${campos}`,
    [datos.razon_social, datos.nrc, datos.nit, datos.contacto, datos.telefono, datos.dias_credito],
    transaction,
  );
  return rows[0];
};

export const actualizarProveedor = async (id, datos, transaction) => {
  const rows = await select(
    `UPDATE compras.proveedores
     SET razon_social = $2, nrc = $3, nit = $4, contacto = $5, telefono = $6, dias_credito = $7
     WHERE id_proveedor = $1 AND deleted_at IS NULL
     RETURNING ${campos}`,
    [id, datos.razon_social, datos.nrc, datos.nit, datos.contacto, datos.telefono, datos.dias_credito],
    transaction,
  );
  return rows[0] ?? null;
};

export const desactivarProveedor = async (id, transaction) => {
  const rows = await select(
    `UPDATE compras.proveedores SET activo = false
     WHERE id_proveedor = $1 AND deleted_at IS NULL
     RETURNING id_proveedor`,
    [id],
    transaction,
  );
  return rows[0] ?? null;
};
