import * as service from './cuentas-por-pagar.service.js';
import { enviarHeadersPaginacion } from '../../../utils/paginacion.js';

export const listar = async (req, res) => {
  const resultado = await service.listar(req.validatedQuery, req.user.id);
  enviarHeadersPaginacion(res, resultado.pagination);
  res.json(resultado.data);
};
