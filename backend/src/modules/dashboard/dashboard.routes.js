import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validateQuery } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './dashboard.controller.js';
import { PERMISOS_ALERTAS } from './dashboard.alertas.js';
import { PERMISOS } from './dashboard.politicas.js';
import { alertasQuery, topProductosQuery, ventasDiariasQuery } from './dashboard.schemas.js';

// /api/dashboard — una ruta por bloque, para que cada uno cargue (y falle) de forma independiente.
// La puerta de cada ruta es requirePermiso; el servicio vuelve a resolver alcance y campos por permiso.
const router = Router();
router.use(authenticate, requireTipo('admin'));

router.get('/ventas-diarias', requirePermiso(PERMISOS.VENTAS_SUCURSAL, PERMISOS.VENTAS_PROPIAS), validateQuery(ventasDiariasQuery), asyncHandler(controller.ventasDiarias));
router.get('/top-productos', requirePermiso(PERMISOS.TOP_PRODUCTOS), validateQuery(topProductosQuery), asyncHandler(controller.topProductos));
router.get('/alertas', requirePermiso(...PERMISOS_ALERTAS), validateQuery(alertasQuery), asyncHandler(controller.alertas));

export default router;
