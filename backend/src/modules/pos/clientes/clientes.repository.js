import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const sel = (sql, bind, tx) =>
  sequelize.query(sql, { bind, transaction: tx, type: QueryTypes.SELECT });

export const listarClientes = ({ q, soloCcf }) =>
  sel(
    `SELECT id_cliente, nombre_razon_social, tipo_documento, num_documento,
            nrc, giro_economico, direccion, email, telefono, creado_en
     FROM pos.clientes
     WHERE ($1::text IS NULL OR
            nombre_razon_social ILIKE '%' || $1 || '%' OR
            num_documento ILIKE '%' || $1 || '%' OR
            nrc ILIKE '%' || $1 || '%')
       AND ($2::boolean IS NOT TRUE OR (nrc IS NOT NULL AND giro_economico IS NOT NULL))
     ORDER BY nombre_razon_social ASC`,
    [q || null, soloCcf === 'true'],
  );

export async function obtenerCliente(idCliente) {
  const rows = await sel(
    `SELECT id_cliente, nombre_razon_social, tipo_documento, num_documento,
            nrc, giro_economico, direccion, email, telefono, creado_en
     FROM pos.clientes
     WHERE id_cliente = $1::int`,
    [idCliente],
  );
  return rows[0] ?? null;
}

export async function crearCliente(tx, data) {
  const rows = await sel(
    `INSERT INTO pos.clientes (
       nombre_razon_social, tipo_documento, num_documento,
       nrc, giro_economico, direccion, email, telefono
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_cliente, nombre_razon_social, tipo_documento, num_documento,
               nrc, giro_economico, direccion, email, telefono, creado_en`,
    [
      data.nombre_razon_social,
      data.tipo_documento || null,
      data.num_documento || null,
      data.nrc || null,
      data.giro_economico || null,
      data.direccion || null,
      data.email || null,
      data.telefono || null,
    ],
    tx,
  );
  return rows[0];
}

export async function actualizarCliente(tx, idCliente, data) {
  const rows = await sel(
    `UPDATE pos.clientes
     SET nombre_razon_social = $1,
         tipo_documento      = $2,
         num_documento       = $3,
         nrc                 = $4,
         giro_economico      = $5,
         direccion           = $6,
         email               = $7,
         telefono            = $8
     WHERE id_cliente = $9::int
     RETURNING id_cliente, nombre_razon_social, tipo_documento, num_documento,
               nrc, giro_economico, direccion, email, telefono, creado_en`,
    [
      data.nombre_razon_social,
      data.tipo_documento || null,
      data.num_documento || null,
      data.nrc || null,
      data.giro_economico || null,
      data.direccion || null,
      data.email || null,
      data.telefono || null,
      idCliente,
    ],
    tx,
  );
  return rows[0] ?? null;
}

export async function eliminarCliente(tx, idCliente) {
  const rows = await sel(
    `DELETE FROM pos.clientes WHERE id_cliente = $1::int RETURNING id_cliente`,
    [idCliente],
    tx,
  );
  return rows[0] ?? null;
}