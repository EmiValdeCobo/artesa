import * as service from './cuentas-por-pagar.service.js';

export const listar = async (req, res) => {
  res.json(await service.listar(req.validatedQuery, req.user.id));
};
