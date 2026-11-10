import { Router } from 'express';
import { authenticate, requireTipo } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './reportes.controller.js';

// /api/reportes — solo lectura sobre las vistas del esquema `reportes`
const router = Router();
router.use(authenticate, requireTipo('admin'), requirePermiso('REP_VER_DASHBOARD'));
router.get('/ventas-diarias', asyncHandler(controller.ventasDiarias));
router.get('/top-productos', asyncHandler(controller.topProductos));
router.get('/ventas-por-metodo-pago', asyncHandler(controller.ventasPorMetodoPago));
router.get('/alertas-stock', asyncHandler(controller.alertasStock));
// El costo de receta es información sensible: además de REP_VER_DASHBOARD exige INV_VER_COSTOS.
router.get('/margen-productos', requirePermiso('INV_VER_COSTOS'), asyncHandler(controller.margenProductos));
router.get('/cuadre-turnos', requirePermiso('CAJA_VER_CUADRES'), asyncHandler(controller.cuadreTurnos));
router.get('/cuentas-por-pagar', requirePermiso('COM_VER_CXP'), asyncHandler(controller.cuentasPorPagar));

export default router;
