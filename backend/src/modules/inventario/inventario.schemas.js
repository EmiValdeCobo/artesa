import { z } from 'zod';

const id = z.coerce.number().int().positive();
const decimal = (max, decimals, min = 0) => z.union([z.number(), z.string()]).transform((v) => String(v).trim())
  .pipe(z.string().regex(new RegExp(`^\\d{1,${max}}(\\.\\d{1,${decimals}})?$`), 'Formato numérico no válido'))
  .refine((v) => Number(v) >= min, `El valor debe ser mayor o igual a ${min}`);
export const idSchema = id;
export const unidadSchema = z.object({
  codigo: z.string().trim().min(1).max(10).transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(2).max(50),
  factorConversion: decimal(6, 4).optional(),
  factor_conversion: decimal(6, 4).optional(),
  activo: z.boolean().optional(),
}).transform((data) => ({
  codigo: data.codigo,
  nombre: data.nombre,
  factor_conversion: data.factorConversion ?? data.factor_conversion ?? '1.0000',
  activo: data.activo ?? true,
}));

export const actualizarUnidadSchema = z.object({
  codigo: z.string().trim().min(1).max(10).transform((v) => v.toUpperCase()).optional(),
  nombre: z.string().trim().min(2).max(50).optional(),
  factorConversion: decimal(6, 4).optional(),
  factor_conversion: decimal(6, 4).optional(),
  activo: z.boolean().optional(),
}).transform((data) => {
  const res = {};
  if (data.codigo !== undefined) res.codigo = data.codigo;
  if (data.nombre !== undefined) res.nombre = data.nombre;
  if (data.factorConversion !== undefined || data.factor_conversion !== undefined) {
    res.factor_conversion = data.factorConversion ?? data.factor_conversion;
  }
  if (data.activo !== undefined) res.activo = data.activo;
  return res;
}).refine((d) => Object.keys(d).length > 0, {
  message: 'Debes proporcionar al menos un campo para actualizar',
});

const camposInsumo = {
  nombre: z.string().trim().min(2).max(100),
  tipoInsumo: z.enum(['INGREDIENTE', 'EMPAQUE', 'REVENTA']).optional(),
  tipo_insumo: z.enum(['INGREDIENTE', 'EMPAQUE', 'REVENTA']).optional(),
  idUnidadBase: id.optional(),
  id_unidad_base: id.optional(),
  costoPromedio: decimal(6, 6).optional(),
  costo_promedio: decimal(6, 6).optional(),
  activo: z.boolean(),
};
const normalizarInsumo = (data, incluirCostoPredeterminado) => ({
  nombre: data.nombre,
  tipoInsumo: data.tipoInsumo ?? data.tipo_insumo,
  idUnidadBase: data.idUnidadBase ?? data.id_unidad_base,
  costoPromedio: data.costoPromedio ?? data.costo_promedio ?? (incluirCostoPredeterminado ? '0.000000' : undefined),
  activo: data.activo,
});
const validarInsumo = (schema) => schema
  .refine((d) => Boolean(d.tipoInsumo), { message: 'El tipo de insumo es obligatorio', path: ['tipoInsumo'] })
  .refine((d) => Boolean(d.idUnidadBase), { message: 'La unidad base es obligatoria', path: ['idUnidadBase'] });
export const insumoSchema = validarInsumo(z.object({ ...camposInsumo, activo: z.boolean().default(true) }).transform((data) => normalizarInsumo(data, true)));
export const actualizarInsumoSchema = validarInsumo(z.object({
  ...camposInsumo,
  activo: z.boolean().optional(),
}).transform((data) => normalizarInsumo(data, false)));

export const productoSchema = z.object({
  idCategoria: id.nullish(),
  id_categoria: id.nullish(),
  nombre: z.string().trim().min(2).max(120),
  codigoBarra: z.string().trim().max(50).nullish(),
  codigo_barra: z.string().trim().max(50).nullish(),
  precioVenta: decimal(8, 2).optional(),
  precio_venta: decimal(8, 2).optional(),
  esElaborado: z.boolean().optional(),
  es_elaborado: z.boolean().optional(),
  idInsumoReventa: id.nullish(),
  id_insumo_reventa: id.nullish(),
  activo: z.boolean().default(true),
}).transform((data) => ({
  idCategoria: data.idCategoria ?? data.id_categoria ?? null,
  nombre: data.nombre,
  codigoBarra: data.codigoBarra ?? data.codigo_barra ?? null,
  precioVenta: data.precioVenta ?? data.precio_venta,
  esElaborado: data.esElaborado ?? data.es_elaborado ?? true,
  idInsumoReventa: data.idInsumoReventa ?? data.id_insumo_reventa ?? null,
  activo: data.activo,
})).refine((v) => v.precioVenta !== undefined, { message: 'El precio de venta es obligatorio', path: ['precioVenta'] })
  .refine((v) => (v.esElaborado && !v.idInsumoReventa) || (!v.esElaborado && !!v.idInsumoReventa), {
    message: 'Los productos de reventa requieren insumo asociado y los elaborados no',
    path: ['idInsumoReventa'],
  });
export const recetaSchema = z.object({ componentes: z.array(z.object({ idInsumo: id, cantidadRequerida: decimal(6, 4).refine((v) => Number(v) > 0, 'La cantidad debe ser mayor a cero') })).min(1).max(100) });
export const stockSchema = z.object({ idSucursal: id, idInsumo: id, cantidad: decimal(10, 4, 0.0001), tipo: z.enum(['INVENTARIO_INICIAL', 'AJUSTE', 'TRASLADO_ENTRADA']), motivo: z.string().trim().min(3).max(500) });
export const minimoSchema = z.object({ idSucursal: id, stockMinimo: decimal(10, 4) });
export const mermaSchema = z.object({ idSucursal: id, cantidad: decimal(10, 4, 0.0001), motivo: z.string().trim().min(3).max(500) });
export const cambiarEstadoSchema = z.object({ activo: z.boolean().optional() });
