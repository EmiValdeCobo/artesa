import * as service from './facturas.service.js';

export const registrarCompra = async (req, res) => {
  const { idCompra, alertasMargen } = await service.registrarCompra(req.body, req.user.id);
  // id_compra se conserva por compatibilidad con clientes existentes; alertasMargen avisa
  // qué productos quedaron bajo el margen mínimo (el precio de venta no se cambia solo).
  res.status(201).json({ id_compra: idCompra, idCompra, alertasMargen });
};
