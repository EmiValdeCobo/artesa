import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as controller from './ventas.controller.js';
import { registrarVentaSchema } from './ventas.schemas.js';

// /api/pos/ventas
const router = Router();

// Toda ruta exige sesión admin
router.use(authenticate, requireTipo('admin'));

// POST  /api/pos/ventas         → registrar venta (FCF o CCF con pagos mixtos)
router.post(
  '/',
  requirePermiso('POS_COBRAR'),
  validate(registrarVentaSchema),
  asyncHandler(controller.registrar),
);

// GET   /api/pos/ventas         → listar ventas del turno (?id_turno=&estado=)
router.get(
  '/',
  requirePermiso('POS_COBRAR'),
  asyncHandler(controller.listar),
);

// GET   /api/pos/ventas/:id     → detalle completo de una venta
router.get(
  '/:id',
  requirePermiso('POS_COBRAR'),
  asyncHandler(controller.detalle),
);

export default router;

