import { z } from 'zod';

// ── Helper: string decimal "0.00" → no float ──────────────────────────────────
const montoStr = z
  .string({ required_error: 'El monto debe ser un string decimal (ej. "5.00")' })
  .regex(/^\d+\.\d{2}$/, 'El monto debe tener exactamente 2 decimales (ej. "5.00")');

// ── Ítem de venta (el precio lo toma la función SQL de BD) ───────────────────
const itemVentaSchema = z.object({
  id_producto: z.number().int().positive(),
  cantidad:    z.number().int().min(1),
  nota:        z.string().max(200).nullable().optional(),
});

// ── Pago individual ───────────────────────────────────────────────────────────
const pagoSchema = z.object({
  metodo:         z.enum(['EFECTIVO', 'TARJETA', 'BITCOIN_CHIVO', 'TRANSFERENCIA'], {
    errorMap: () => ({ message: "metodo debe ser EFECTIVO, TARJETA, BITCOIN_CHIVO o TRANSFERENCIA" }),
  }),
  monto:          montoStr,
  monto_recibido: montoStr.nullable().optional(), // solo para EFECTIVO (vuelto)
  referencia:     z.string().max(100).nullable().optional(),
});

// ── POST /api/pos/ventas ──────────────────────────────────────────────────────
export const registrarVentaSchema = z.object({
  id_turno:         z.string().uuid({ message: 'id_turno debe ser un UUID válido' }),
  tipo_comprobante: z.enum(['FCF', 'CCF'], {
    errorMap: () => ({ message: "tipo_comprobante debe ser 'FCF' o 'CCF'" }),
  }),
  id_cliente:       z.number().int().positive().nullable().optional(),
  id_orden:         z.number().int().positive().nullable().optional(),
  descuento:        montoStr.optional().default('0.00'),
  items:            z.array(itemVentaSchema).min(1, { message: 'La venta debe tener al menos un producto' }),
  pagos:            z.array(pagoSchema).min(1, { message: 'La venta debe tener al menos un pago' }),
}).superRefine((val, ctx) => {
  // CCF obliga a id_cliente
  if (val.tipo_comprobante === 'CCF' && !val.id_cliente) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id_cliente'],
      message: 'Un CCF requiere id_cliente con NRC y giro económico',
    });
  }
});

