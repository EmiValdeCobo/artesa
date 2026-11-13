import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as controller from './cuentas-por-pagar.controller.js';
import { filtrosCuentasPorPagarSchema } from './cuentas-por-pagar.schemas.js';

const router = Router();
const validarFiltros = (req, _res, next) => {
  const resultado = filtrosCuentasPorPagarSchema.safeParse(req.query);
  if (!resultado.success) return next(resultado.error);
  req.validatedQuery = resultado.data;
  next();
};

router.get(
  '/cuentas-por-pagar',
  authenticate,
  requirePermiso('COM_VER_CXP'),
  validarFiltros,
  asyncHandler(controller.listar),
);

export default router;
