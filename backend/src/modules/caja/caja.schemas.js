import { z } from 'zod';
import { MENSAJE_RANGO, rangoFechasValido } from '../../utils/rangoFechas.js';

// Dinero: se recibe como número o texto, pero se conserva como string con máx. 2 decimales
// (NUMERIC(10,2) en PostgreSQL). Nunca se opera con float.
const montoTexto = z
  .union([z.number(), z.string()])
  .transform((valor) => String(valor).trim())
  .pipe(z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, 'El monto debe ser un número positivo con hasta 2 decimales'));

export const idTurnoSchema = z.uuid('El identificador del turno no es válido');

// Tope del fondo inicial: un fondo de caja mayor es casi siempre un error de digitación.
// Debe coincidir con MONTO_APERTURA_MAXIMO del frontend (CajaPage.jsx).
export const MONTO_APERTURA_MAXIMO = '10000.00';
// Zod 4 ejecuta los refine aunque la regex ya haya fallado: un texto no numérico vale 0 aquí
// (el error que ve el usuario es el de la regex, no una excepción de BigInt).
const aCentavos = (texto) => {
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return 0n;
  const [entera, decimales = ''] = texto.split('.');
  return BigInt(entera) * 100n + BigInt(decimales.padEnd(2, '0'));
};

export const abrirTurnoSchema = z.object({
  idCaja: z.coerce.number().int().positive('Selecciona una caja'),
  // El fondo inicial puede ser 0.00; se compara en centavos (BigInt), nunca con float.
  montoApertura: montoTexto.refine(
    (valor) => aCentavos(valor) <= aCentavos(MONTO_APERTURA_MAXIMO),
    `El fondo inicial no puede superar $${MONTO_APERTURA_MAXIMO}`,
  ),
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
  digital: montoTexto, // transferencias bancarias
  bitcoin: montoTexto.default('0.00'), // Bitcoin / Chivo Wallet (se cuadra aparte)
});

export const filtrosCuadresSchema = z
  .object({
    estado: z.enum(['ABIERTO', 'CERRADO']).optional(),
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
    idSucursal: z.coerce.number().int().positive().optional(),
  })
  .refine(rangoFechasValido, { message: MENSAJE_RANGO, path: ['desde'] });

