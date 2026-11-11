import { z } from 'zod';

const fecha = z.iso.date();
const rango = {
  startDate: fecha.optional(),
  endDate: fecha.optional(),
  module: z.string().trim().min(1).max(80).optional(),
  user: z.string().trim().min(1).max(80).optional(),
};
const rangoValido = (f) => (!f.startDate && !f.endDate) || Boolean(f.startDate && f.endDate && f.startDate <= f.endDate
  && (Date.parse(`${f.endDate}T00:00:00Z`) - Date.parse(`${f.startDate}T00:00:00Z`)) / 86400000 <= 366);
const validarRango = (schema) => schema.refine(rangoValido, { message: 'Indica ambas fechas y usa un rango máximo de 366 días.', path: ['startDate'] });

export const listaBitacoraQuery = validarRango(z.strictObject({
  ...rango,
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN']).optional(),
  search: z.string().trim().max(120).optional(),
}));

export const metricasBitacoraQuery = validarRango(z.strictObject({
  ...rango,
  granularity: z.enum(['hour', 'day']).default('day'),
}));
