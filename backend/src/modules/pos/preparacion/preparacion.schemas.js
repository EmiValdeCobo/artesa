import { z } from 'zod';

export const idOrdenSchema = z.coerce.number().int().positive('El identificador de la orden no es válido');

// Preparación solo avanza la orden; FACTURADA y ANULADA las fija el POS al cobrar o anular.
export const cambiarEstadoSchema = z.object({
  estado: z.enum(['EN_PREPARACION', 'LISTA', 'ENTREGADA'], {
    error: 'El estado debe ser EN_PREPARACION, LISTA o ENTREGADA',
  }),
});

// Cancelar un pedido Nueva: el motivo es obligatorio (queda en la orden y, si se cobró, en la venta).
export const anularOrdenSchema = z.object({
  motivo: z.string().trim().min(5, 'Indica el motivo (mínimo 5 caracteres)').max(200, 'Máximo 200 caracteres'),
});

export const filtrosColaSchema = z.object({
  idSucursal: z.coerce.number().int().positive().optional(),
});
