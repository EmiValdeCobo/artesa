import { Router } from 'express';
import { authenticate, requireTipo } from '../../../middlewares/auth.js';
import { requirePermiso } from '../../../middlewares/permisos.js';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as controller from './proveedores.controller.js';
import { idProveedorSchema, listarProveedoresSchema, proveedorSchema } from './proveedores.schemas.js';

const router = Router();
const validateId = (req, _res, next) => {
  const resultado = idProveedorSchema.safeParse(req.params);
  if (!resultado.success) return next(resultado.error);
  req.validatedParams = resultado.data;
  next();
};
const validateQuery = (req, _res, next) => {
  const resultado = listarProveedoresSchema.safeParse(req.query);
  if (!resultado.success) return next(resultado.error);
  req.validatedQuery = resultado.data;
  next();
};

router.use(authenticate, requireTipo('admin'));
router.get('/proveedores', requirePermiso('COM_GESTIONAR_PROVEEDORES', 'COM_REGISTRAR_COMPRA'), validateQuery, asyncHandler(controller.listarProveedores));
router.post('/proveedores', requirePermiso('COM_GESTIONAR_PROVEEDORES'), validate(proveedorSchema), asyncHandler(controller.crearProveedor));
router.put('/proveedores/:id', requirePermiso('COM_GESTIONAR_PROVEEDORES'), validateId, validate(proveedorSchema), asyncHandler(controller.actualizarProveedor));
router.delete('/proveedores/:id', requirePermiso('COM_GESTIONAR_PROVEEDORES'), validateId, asyncHandler(controller.desactivarProveedor));

export default router;
