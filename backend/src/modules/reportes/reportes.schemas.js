import { z } from 'zod';
import { MENSAJE_RANGO, rangoFechasValido } from '../../utils/rangoFechas.js';

const idSucursal = z.coerce.number().int().positive().optional();

// Sin desde/hasta: últimos 30 días. Con una sola fecha o un rango > 366 días: 400.
const rango = { desde: z.iso.date().optional(), hasta: z.iso.date().optional(), idSucursal };
const validarRango = (schema) => schema.refine(rangoFechasValido, { message: MENSAJE_RANGO, path: ['desde'] });

export const filtrosVentasSchema = validarRango(z.object(rango));
export const filtrosTopProductosSchema = validarRango(
  z.object({ ...rango, limite: z.coerce.number().int().min(1).max(50).default(10) }),
);
export const filtrosAlertasSchema = z.object({
  idSucursal,
  nivel: z.enum(['AGOTADO', 'BAJO_MINIMO']).optional(),
});
export const filtrosCuadreSchema = validarRango(z.object(rango));
export const filtrosCuentasPorPagarSchema = validarRango(z.object(rango));
