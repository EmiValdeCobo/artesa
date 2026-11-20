import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { eliminarFactura, obtenerDetalle, registrarCompra } from './facturas.controller.js';
import { eliminarFacturaSchema, idFacturaSchema, registrarCompraSchema } from './facturas.schemas.js';

const router = Router();
const validarId = (req, _res, next) => {
  const resultado = idFacturaSchema.safeParse({ id: req.params.id });
  if (!resultado.success) return next(resultado.error);
  req.validatedParams = resultado.data;
  next();
};

router.post(
  '/',
  authenticate,
  requireTipo('admin'),
  requirePermiso('COM_REGISTRAR_COMPRA'),
  validate(registrarCompraSchema),
  asyncHandler(registrarCompra),
);

router.get(
  '/facturas/:id',
  authenticate,
  requireTipo('admin'),
  requirePermiso('COM_VER_CXP'),
  validarId,
  asyncHandler(obtenerDetalle),
);

// Solo ADMIN tiene COM_ELIMINAR_FACTURA (migración 020): ocultar el botón no basta.
router.delete(
  '/facturas/:id',
  authenticate,
  requireTipo('admin'),
  requirePermiso('COM_ELIMINAR_FACTURA'),
  validarId,
  (req, _res, next) => { req.body = req.body ?? {}; next(); },
  validate(eliminarFacturaSchema),
  asyncHandler(eliminarFactura),
);

export default router;
