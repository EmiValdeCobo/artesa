import { z } from 'zod';

const id = z.coerce.number().int().positive();
const salario = z
  .union([z.number(), z.string()])
  .transform((v) => String(v).trim())
  .pipe(z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, 'Formato numérico no válido'))
  .refine((v) => Number(v) > 0, 'El salario debe ser mayor a cero');
const nombre = z.string().trim().min(2).max(50);
const descripcionPersona = z.string().trim().min(2).max(100);
const dui = z
  .string()
  .trim()
  .regex(/^\d{8}-\d$/, 'El DUI debe tener el formato 00000000-0');
// En caso de NIT homologado con el DUI, el formulario puede omitirlo,
// enviarlo como null o dejarlo vacío; todos esos casos se persisten como NULL.
const nit = z
  .preprocess(
    (valor) => (valor == null || String(valor).trim() === '' ? null : valor),
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'El NIT debe tener el formato 0000-000000-000-0')
      .nullable()
      .optional(),
  )
  .transform((valor) => valor || null); //Transform hace el codigo más robusto
const fecha = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD');

export const idSchema = id;
export const idEmpleadoSchema = z.uuid();
export const puestoSchema = z.object({ nombre, salarioBase: salario });
export const empleadoSchema = z.object({
  idSucursal: id,
  idPuesto: id,
  idUsuario: z.uuid().optional().nullable(),
  nombres: descripcionPersona,
  apellidos: descripcionPersona,
  dui,
  nit,
  fechaIngreso: fecha,
  salarioNominal: salario,
  activo: z.boolean().default(true),
});
