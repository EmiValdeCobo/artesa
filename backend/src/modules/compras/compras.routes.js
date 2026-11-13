import { Router } from 'express';
import facturasRoutes from './facturas/facturas.routes.js';
import proveedoresRoutes from './proveedores/proveedores.routes.js';

const router = Router();
router.use(facturasRoutes);
router.use(proveedoresRoutes);

export default router;
