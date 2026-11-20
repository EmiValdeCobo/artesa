import { z } from 'zod';

const idFacturaSchema = z.object({ id: z.string().uuid() });
const montoSchema = z.string().trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'El monto debe tener hasta 10 enteros y 2 decimales')
  .refine((valor) => /[1-9]/.test(valor.replace('.', '')), 'El monto debe ser mayor a cero');

export const registrarPagoSchema = z.strictObject({
  monto: montoSchema,
  metodo: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA']),
  referencia: z.string().trim().max(100).optional().nullable()
    .transform((valor) => valor || null),
});

export const idFacturaPagoSchema = idFacturaSchema;
