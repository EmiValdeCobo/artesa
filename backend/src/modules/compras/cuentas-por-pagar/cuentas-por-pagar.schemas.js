import { z } from 'zod';
import { MENSAJE_RANGO, rangoFechasValido } from '../../../utils/rangoFechas.js';
import { camposPaginacion } from '../../../utils/paginacion.js';

const filtros = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  idSucursal: z.coerce.number().int().positive().optional(),
  estado: z.enum(['pendientes', 'pagadas', 'todas']).default('pendientes'),
  ...camposPaginacion,
});

export const filtrosCuentasPorPagarSchema = filtros.refine(rangoFechasValido, {
  message: MENSAJE_RANGO,
  path: ['desde'],
});
