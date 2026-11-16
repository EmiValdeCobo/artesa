import { z } from 'zod';

const textoOpcional = (max) => z.string().trim().max(max).optional().nullable();
const nrcSchema = z.string().trim().regex(/^\d{6}-\d$/, 'El NRC debe tener formato 123456-7');
const nitSchema = z.string().trim().regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'El NIT debe tener formato 0614-123456-123-1');
const telefonoSchema = textoOpcional(9).refine(
  (valor) => valor == null || valor === '' || /^\d{4}-\d{4}$/.test(valor),
  'El teléfono debe tener formato 2222-3333',
);
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
  nrc: nrcSchema,
  nit: nitSchema,
  contacto: textoOpcional(100),
  telefono: telefonoSchema,
  diasCredito: diasCreditoSchema,
}).transform(({ razonSocial, nrc, nit, contacto, telefono, diasCredito }) => ({
  razon_social: razonSocial,
  nrc,
  nit,
  contacto: contacto || null,
  telefono: telefono || null,
  dias_credito: diasCredito,
}));
