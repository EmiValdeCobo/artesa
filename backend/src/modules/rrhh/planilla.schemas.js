import { z } from 'zod';

const monto = z.union([z.string(), z.number()]).transform(String)
  .pipe(z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).refine((v) => Number(v) >= 0, 'El monto no puede ser negativo'));
const idEmpleado = z.uuid();
export const periodoSchema = z.object({
  idSucursal: z.coerce.number().int().positive(),
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use AAAA-MM'),
  ajustes: z.array(z.object({ idEmpleado, bonificaciones: monto.default('0'), otrosDescuentos: monto.default('0'), detalle: z.array(z.string().trim().min(1).max(150)).max(20).default([]) })).max(500).default([]),
});
export const idPlanillaSchema = z.coerce.number().int().positive();
export const idEmpleadoPlanillaSchema = z.uuid();
