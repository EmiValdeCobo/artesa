import { z } from 'zod';

export const clienteSchema = z
  .object({
    nombre_razon_social: z
      .string({ required_error: 'El nombre o razón social es obligatorio' })
      .trim()
      .min(2, 'Mínimo 2 caracteres')
      .max(150, 'Máximo 150 caracteres'),
    tipo_documento: z
      .enum(['DUI', 'NIT', 'PASAPORTE'], {
        errorMap: () => ({ message: 'tipo_documento debe ser DUI, NIT o PASAPORTE' }),
      })
      .nullable()
      .optional(),
    num_documento: z.string().trim().max(20).nullable().optional(),
    nrc: z
      .string()
      .trim()
      .regex(/^\d{1,8}-\d$/, 'Formato de NRC inválido (ej. 123456-7)')
      .nullable()
      .optional()
      .or(z.literal('')),
    giro_economico: z.string().trim().max(150).nullable().optional(),
    direccion: z.string().trim().max(500).nullable().optional(),
    email: z.string().trim().email('Correo electrónico inválido').max(120).nullable().optional().or(z.literal('')),
    telefono: z.string().trim().max(20).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const tieneNrc = Boolean(val.nrc && val.nrc.trim() !== '');
    const tieneGiro = Boolean(val.giro_economico && val.giro_economico.trim() !== '');

    if (tieneNrc && !tieneGiro) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['giro_economico'],
        message: 'El giro económico es obligatorio cuando se registra NRC (para CCF)',
      });
    }
    if (tieneGiro && !tieneNrc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nrc'],
        message: 'El NRC es obligatorio cuando se indica giro económico (para CCF)',
      });
    }
    if (val.num_documento && !val.tipo_documento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tipo_documento'],
        message: 'Debe seleccionar el tipo de documento',
      });
    }
  });