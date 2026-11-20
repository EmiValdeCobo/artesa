import { z } from 'zod';

const REGLAS_DOC = {
  DUI: /^\d{8}-\d$/,
  NIT: /^(\d{4}-\d{6}-\d{3}-\d|\d{8}-\d)$/,
  PASAPORTE: /^[A-Za-z0-9]{6,12}$/,
};

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
      .regex(/^\d{2,8}-\d$/, 'NRC inválido para El Salvador (ej. 123456-7)')
      .nullable()
      .optional()
      .or(z.literal('')),
    giro_economico: z.string().trim().max(150).nullable().optional(),
    direccion: z.string().trim().max(500).nullable().optional(),
    email: z.string().trim().email('Correo electrónico inválido').max(120).nullable().optional().or(z.literal('')),
    telefono: z
      .string()
      .trim()
      .regex(/^[267]\d{3}-?\d{4}$/, 'Teléfono inválido: 8 dígitos de El Salvador iniciando con 2, 6 o 7')
      .nullable()
      .optional()
      .or(z.literal('')),
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
    if (val.tipo_documento && val.num_documento) {
      const regex = REGLAS_DOC[val.tipo_documento];
      if (regex && !regex.test(val.num_documento)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['num_documento'],
          message: `Formato de ${val.tipo_documento} inválido para El Salvador`,
        });
      }
    }
  });