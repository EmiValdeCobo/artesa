import { z } from 'zod';

const id = z.coerce.number().int().positive();
const decimal = (max, decimals, min = 0) => z.union([z.number(), z.string()]).transform((v) => String(v).trim())
  .pipe(z.string().regex(new RegExp(`^\\d{1,${max}}(\\.\\d{1,${decimals}})?$`), 'Formato numérico no válido'))
  .refine((v) => Number(v) >= min, `El valor debe ser mayor o igual a ${min}`);
export const idSchema = id;
export const unidadSchema = z.object({ codigo: z.string().trim().min(1).max(10).transform((v) => v.toUpperCase()), nombre: z.string().trim().min(2).max(50) });
export const insumoSchema = z.object({ nombre: z.string().trim().min(2).max(100), tipoInsumo: z.enum(['INGREDIENTE', 'EMPAQUE', 'REVENTA']), idUnidadBase: id, costoPromedio: decimal(6, 6), activo: z.boolean().default(true) });
export const productoSchema = z.object({ idCategoria: id.nullish(), nombre: z.string().trim().min(2).max(120), codigoBarra: z.string().trim().max(50).nullish(), precioVenta: decimal(8, 2), esElaborado: z.boolean(), idInsumoReventa: id.nullish(), activo: z.boolean().default(true) }).refine((v) => (v.esElaborado && !v.idInsumoReventa) || (!v.esElaborado && !!v.idInsumoReventa), { message: 'Los productos de reventa requieren insumo asociado y los elaborados no', path: ['idInsumoReventa'] });
export const recetaSchema = z.object({ componentes: z.array(z.object({ idInsumo: id, cantidadRequerida: decimal(6, 4).refine((v) => Number(v) > 0, 'La cantidad debe ser mayor a cero') })).min(1).max(100) });
export const stockSchema = z.object({ idSucursal: id, idInsumo: id, cantidad: decimal(10, 4, 0.0001), tipo: z.enum(['INVENTARIO_INICIAL', 'AJUSTE', 'TRASLADO_ENTRADA']), motivo: z.string().trim().min(3).max(500) });
export const minimoSchema = z.object({ idSucursal: id, stockMinimo: decimal(10, 4) });
export const mermaSchema = z.object({ idSucursal: id, cantidad: decimal(10, 4, 0.0001), motivo: z.string().trim().min(3).max(500) });
