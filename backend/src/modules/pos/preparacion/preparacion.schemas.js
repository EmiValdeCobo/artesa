import { z } from 'zod';

export const idOrdenSchema = z.coerce.number().int().positive('El identificador de la orden no es válido');

// Preparación solo avanza la orden; FACTURADA y ANULADA las fija el POS al cobrar o anular.
export const cambiarEstadoSchema = z.object({
  estado: z.enum(['EN_PREPARACION', 'LISTA', 'ENTREGADA'], {
    error: 'El estado debe ser EN_PREPARACION, LISTA o ENTREGADA',
  }),
});

export const filtrosColaSchema = z.object({
  idSucursal: z.coerce.number().int().positive().optional(),
});
