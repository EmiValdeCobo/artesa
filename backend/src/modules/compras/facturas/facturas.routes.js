import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { registrarCompra } from './facturas.controller.js';
import { registrarCompraSchema } from './facturas.schemas.js';

const router = Router();
router.post(
  '/',
  authenticate,
  requireTipo('admin'),
  requirePermiso('COM_REGISTRAR_COMPRA'),
  validate(registrarCompraSchema),
  asyncHandler(registrarCompra),
);

export default router;
