import * as service from './facturas.service.js';

export const registrarCompra = async (req, res) => {
  const idCompra = await service.registrarCompra(req.body, req.user.id);
  res.status(201).json({ id_compra: idCompra });
};
