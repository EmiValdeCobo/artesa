import { z } from 'zod';
import { MENSAJE_RANGO, rangoFechasValido } from '../../utils/rangoFechas.js';

// Dinero: se recibe como número o texto, pero se conserva como string con máx. 2 decimales
// (NUMERIC(10,2) en PostgreSQL). Nunca se opera con float.
const montoTexto = z
  .union([z.number(), z.string()])
  .transform((valor) => String(valor).trim())
  .pipe(z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, 'El monto debe ser un número positivo con hasta 2 decimales'));

export const idTurnoSchema = z.uuid('El identificador del turno no es válido');

export const abrirTurnoSchema = z.object({
  idCaja: z.coerce.number().int().positive('Selecciona una caja'),
  montoApertura: montoTexto, // el fondo inicial puede ser 0
});

export const crearMovimientoSchema = z.object({
  tipo: z.enum(['INGRESO', 'EGRESO'], { error: 'El tipo debe ser INGRESO o EGRESO' }),
  concepto: z.string().trim().min(3, 'El concepto debe tener al menos 3 caracteres').max(150),
  monto: montoTexto.refine((valor) => Number(valor) > 0, 'El monto debe ser mayor que cero'),
});

// Lo que el cajero CUENTA al cerrar (puede ser 0 en cualquiera de los tres).
export const cerrarTurnoSchema = z.object({
  efectivo: montoTexto,
  tarjeta: montoTexto,
  digital: montoTexto, // Bitcoin/Chivo + transferencias
});

export const filtrosCuadresSchema = z
  .object({
    estado: z.enum(['ABIERTO', 'CERRADO']).optional(),
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
    idSucursal: z.coerce.number().int().positive().optional(),
  })
  .refine(rangoFechasValido, { message: MENSAJE_RANGO, path: ['desde'] });

