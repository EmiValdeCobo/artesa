import { z } from 'zod';

const textoOpcional = (max) => z.string().trim().max(max).optional().nullable();
const diasCreditoSchema = z.union([
  z.number(),
  z.string().trim().regex(/^\d+$/, 'Debe ser un entero no negativo').transform(Number),
]).pipe(z.number().int().min(0));

export const idProveedorSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listarProveedoresSchema = z.object({
  activo: z.enum(['true', 'false']).transform((valor) => valor === 'true').optional(),
});

export const proveedorSchema = z.object({
  razonSocial: z.string().trim().min(1).max(150),
  nrc: z.string().trim().min(1).max(20),
  nit: z.string().trim().min(1).max(20),
  contacto: textoOpcional(100),
  telefono: textoOpcional(20),
  diasCredito: diasCreditoSchema,
}).transform(({ razonSocial, nrc, nit, contacto, telefono, diasCredito }) => ({
  razon_social: razonSocial,
  nrc,
  nit,
  contacto: contacto || null,
  telefono: telefono || null,
  dias_credito: diasCredito,
}));
