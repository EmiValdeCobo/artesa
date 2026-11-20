import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as controller from './pagos.controller.js';
import { idFacturaPagoSchema, registrarPagoSchema } from './pagos.schemas.js';

const router = Router();
const validarIdFactura = (req, _res, next) => {
  const resultado = idFacturaPagoSchema.safeParse({ id: req.params.id });
  if (!resultado.success) return next(resultado.error);
  req.validatedParams = resultado.data;
  next();
};

router.post(
  '/:id/pagos',
  authenticate,
  requireTipo('admin'),
  requirePermiso('COM_PAGAR_PROVEEDOR'),
  validarIdFactura,
  validate(registrarPagoSchema),
  asyncHandler(controller.registrarPago),
);

export default router;
