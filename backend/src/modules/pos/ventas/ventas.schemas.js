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

// ── Comprobante por método (se guarda en pos.pagos.referencia) ────────────────
export const REFERENCIA_POR_METODO = {
  TARJETA:       { nombre: 'el número de autorización del voucher', patron: /^\d{6,12}$/, mensaje: 'La autorización de tarjeta debe tener de 6 a 12 dígitos' },
  TRANSFERENCIA: { nombre: 'la referencia bancaria', patron: /^[A-Z0-9-]{6,30}$/, mensaje: 'La referencia bancaria debe tener de 6 a 30 letras mayúsculas, números o guiones' },
  BITCOIN_CHIVO: { nombre: 'el ID de transacción de Chivo/Lightning', patron: /^[A-Za-z0-9]{8,100}$/, mensaje: 'El ID de transacción Bitcoin/Chivo debe tener de 8 a 100 letras o números' },
};

// ── Pago individual ───────────────────────────────────────────────────────────
const pagoSchema = z.object({
  metodo:         z.enum(['EFECTIVO', 'TARJETA', 'BITCOIN_CHIVO', 'TRANSFERENCIA'], {
    errorMap: () => ({ message: "metodo debe ser EFECTIVO, TARJETA, BITCOIN_CHIVO o TRANSFERENCIA" }),
  }),
  monto:          montoStr,
  monto_recibido: montoStr.nullable().optional(), // solo para EFECTIVO (vuelto)
  referencia:     z.string().trim().max(100).nullable().optional(),
}).superRefine((pago, ctx) => {
  // Comprobante obligatorio en pagos no en efectivo; el formato depende del método.
  // Debe coincidir con REFERENCIAS_PAGO de frontend/src/utils/mascaras.js.
  const regla = REFERENCIA_POR_METODO[pago.metodo];
  if (!regla) return;
  if (!pago.referencia) {
    ctx.addIssue({ code: 'custom', path: ['referencia'], message: `El pago con ${pago.metodo} requiere ${regla.nombre}` });
  } else if (!regla.patron.test(pago.referencia)) {
    ctx.addIssue({ code: 'custom', path: ['referencia'], message: regla.mensaje });
  }
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

// ── PATCH /api/pos/ventas/:id/anular ──────────────────────────────────────────
export const anularVentaSchema = z.object({
  motivo: z
    .string({ required_error: 'El motivo de anulación es obligatorio' })
    .trim()
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(255, 'El motivo no puede exceder 255 caracteres'),
});