import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const select = (sql, bind, transaction) => sequelize.query(sql, {
  bind,
  transaction,
  type: QueryTypes.SELECT,
});

export const buscarFacturaParaPago = async (idCompra, transaction) => {
  const rows = await select(
    `SELECT id_compra, estado_pago
     FROM compras.facturas_compra
     WHERE id_compra = $1::uuid
     FOR UPDATE`,
    [idCompra],
    transaction,
  );
  return rows[0] ?? null;
};

export const insertarPago = async (idCompra, datos, userId, transaction) => {
  const rows = await select(
    `INSERT INTO compras.pagos_proveedor
       (id_compra, fecha_pago, monto, metodo, referencia, id_usuario)
     VALUES ($1::uuid, CURRENT_DATE, $2::numeric, $3::varchar, $4::varchar, $5::uuid)
     RETURNING id_pago`,
    [idCompra, datos.monto, datos.metodo, datos.referencia, userId],
    transaction,
  );
  return rows[0]?.id_pago;
};

export const obtenerPagoRegistrado = async (idPago, transaction) => {
  const rows = await select(
    `WITH totales AS (
       SELECT id_compra, SUM(monto) AS total_pagado
       FROM compras.pagos_proveedor
       GROUP BY id_compra
     )
     SELECT p.id_pago, p.id_compra,
            to_char(p.fecha_pago, 'YYYY-MM-DD') AS fecha_pago,
            p.monto::text AS monto, p.metodo, p.referencia,
            f.estado_pago, t.total_pagado::text AS total_pagado,
            (f.total - t.total_pagado)::text AS saldo
     FROM compras.pagos_proveedor p
     JOIN compras.facturas_compra f ON f.id_compra = p.id_compra
     JOIN totales t ON t.id_compra = p.id_compra
     WHERE p.id_pago = $1`,
    [idPago],
    transaction,
  );
  return rows[0] ?? null;
};
