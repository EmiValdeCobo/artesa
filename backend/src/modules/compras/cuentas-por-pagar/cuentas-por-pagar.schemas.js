import { z } from 'zod';
import { MENSAJE_RANGO, rangoFechasValido } from '../../../utils/rangoFechas.js';
import { camposPaginacion } from '../../../utils/paginacion.js';

const filtros = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  idSucursal: z.coerce.number().int().positive().optional(),
  tipoCosto: z.enum(['COSTO', 'GASTO']).optional(),
  estado: z.enum(['pendientes', 'pagadas', 'todas']).default('pendientes'),
  // Fecha sobre la que aplica desde/hasta: emisión (gastos) o vencimiento (CxP).
  campoFecha: z.enum(['emision', 'vencimiento']).default('emision'),
  ...camposPaginacion,
});

export const filtrosCuentasPorPagarSchema = filtros.refine(rangoFechasValido, {
  message: MENSAJE_RANGO,
  path: ['desde'],
});
