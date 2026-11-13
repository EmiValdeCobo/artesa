import { Router } from 'express';
import facturasRoutes from './facturas/facturas.routes.js';
import cuentasPorPagarRoutes from './cuentas-por-pagar/cuentas-por-pagar.routes.js';
import pagosRoutes from './pagos/pagos.routes.js';
import proveedoresRoutes from './proveedores/proveedores.routes.js';

const router = Router();
router.use(facturasRoutes);
router.use(cuentasPorPagarRoutes);
router.use(pagosRoutes);
router.use(proveedoresRoutes);

export default router;
