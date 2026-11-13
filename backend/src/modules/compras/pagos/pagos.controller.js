import * as service from './pagos.service.js';

export const registrarPago = async (req, res) => {
  const pago = await service.registrarPago(req.validatedParams.id, req.body, req.user.id);
  res.status(201).json(pago);
};
