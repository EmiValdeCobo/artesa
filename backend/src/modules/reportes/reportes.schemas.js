import { z } from 'zod';
import { MENSAJE_RANGO, rangoFechasValido } from '../../utils/rangoFechas.js';

const idSucursal = z.coerce.number().int().positive().optional();

// Sin desde/hasta: últimos 30 días. Con una sola fecha o un rango > 366 días: 400.
const rango = { desde: z.iso.date().optional(), hasta: z.iso.date().optional(), idSucursal };

export const filtrosVentasSchema = z
  .object(rango)
  .refine(rangoFechasValido, { message: MENSAJE_RANGO, path: ['desde'] });

export const filtrosTopProductosSchema = z
  .object({ ...rango, limite: z.coerce.number().int().min(1).max(50).default(10) })
  .refine(rangoFechasValido, { message: MENSAJE_RANGO, path: ['desde'] });

export const filtrosAlertasSchema = z.object({
  idSucursal,
  nivel: z.enum(['AGOTADO', 'BAJO_MINIMO']).optional(),
});
