import { z } from 'zod';

// Teléfono salvadoreño: 8 dígitos, se guarda siempre con la máscara 2222-3333.
const telefonoSchema = z.string().trim().max(20).nullable().optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-?\d{4}$/.test(v), 'El teléfono debe tener formato 2222-3333')
  .transform((v) => (v === null ? null : `${v.replace('-', '').slice(0, 4)}-${v.replace('-', '').slice(4)}`));
const entero = (min, mensaje) => z.union([z.number(), z.string()]).transform((v) => String(v).trim())
  .pipe(z.string().regex(/^\d{1,10}$/, mensaje)).transform(Number).pipe(z.number().int().min(min, mensaje));

export const sucursalSchema = z.object({
  codigoEstablecimiento: z.string().trim().regex(/^[A-Z0-9]{4}$/i).transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(2).max(100),
  direccion: z.string().trim().min(3).max(500),
  departamento: z.string().trim().min(2).max(50),
  telefono: telefonoSchema,
  activa: z.boolean().default(true),
});
export const parametroSchema = z.object({ clave: z.string().trim().min(1).max(60), valor: z.string().trim().min(1).max(100) });
// Apertura: stock mínimo para operar (entero > 0) y carga inicial opcional (entero ≥ 0) por insumo requerido.
export const aperturaSchema = z.object({
  items: z.array(z.object({
    idInsumo: z.coerce.number().int().positive(),
    stockMinimo: entero(1, 'El stock mínimo debe ser un entero mayor a cero'),
    cantidadInicial: entero(0, 'La carga inicial debe ser un entero no negativo').default(0),
  })).min(1, 'Indica al menos un insumo').refine((xs) => new Set(xs.map((x) => x.idInsumo)).size === xs.length, 'Hay insumos repetidos'),
});
