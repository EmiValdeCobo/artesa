import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import seguridadRoutes from './seguridad/seguridad.routes.js';
import { cajasRoutes, turnosRoutes } from './caja/caja.routes.js';
import inventarioRoutes from './inventario/inventario.routes.js';
import dashboardRoutes from './dashboard/dashboard.routes.js';
import reportesRoutes from './reportes/reportes.routes.js';
import preparacionRoutes from './pos/preparacion/preparacion.routes.js';
import ordenesRoutes from './pos/ordenes/ordenes.routes.js';
import ventasRoutes from './pos/ventas/ventas.routes.js';
import rrhhRoutes from './rrhh/rrhh.routes.js';
import empresaRoutes from './empresa/empresa.routes.js';
import bitacoraRoutes from './bitacora/bitacora.routes.js';
import proveedoresRoutes from './compras/proveedores/proveedores.routes.js';

// Cada módulo registra aquí su router bajo /api/<recurso-plural>
// Ejemplo (cuando exista): router.use('/insumos', insumosRoutes);
const router = Router();
router.use('/auth', authRoutes);
router.use('/seguridad', seguridadRoutes);
router.use('/cajas', cajasRoutes);
router.use('/turnos', turnosRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reportes', reportesRoutes);
router.use('/preparacion', preparacionRoutes);
router.use('/pos/ordenes', ordenesRoutes);
router.use('/pos/ventas', ventasRoutes);
router.use('/rrhh', rrhhRoutes);
router.use('/empresa', empresaRoutes);
router.use('/bitacora', bitacoraRoutes);
router.use('/compras', proveedoresRoutes);

export default router;
