import { z } from 'zod';

const idPositivo = z.number().int().positive();

const fechaCalendario = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
  .refine((valor) => {
    const [anio, mes, dia] = valor.split('-').map(Number);
    const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
    const diasMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return anio >= 1 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasMes[mes - 1];
  }, 'La fecha no es válida');

const cantidad = z.string().trim()
  .regex(/^\d{1,8}(?:\.\d{1,4})?$/, 'La cantidad debe tener hasta 8 enteros y 4 decimales')
  .refine((valor) => /[1-9]/.test(valor.replace('.', '')), 'La cantidad debe ser mayor a cero');

const costoUnitario = z.string().trim()
  .regex(/^\d{1,6}(?:\.\d{1,6})?$/, 'El costo debe tener hasta 6 enteros y 6 decimales');

const itemCostoSchema = z.strictObject({
  idInsumo: idPositivo,
  cantidad,
  costoUnitario,
});

const itemGastoSchema = z.strictObject({
  descripcion: z.string().trim().min(1).max(150),
  cantidad,
  costoUnitario,
});

const compraComun = {
  idProveedor: idPositivo,
  idSucursal: idPositivo,
  numeroFactura: z.string().trim().min(1).max(50),
  fechaEmision: fechaCalendario,
  condicionPago: z.enum(['CONTADO', 'CREDITO']),
};

const compraCostoSchema = z.strictObject({
  ...compraComun,
  tipoCosto: z.literal('COSTO').optional().default('COSTO'),
  items: z.array(itemCostoSchema).min(1),
});

const compraGastoSchema = z.strictObject({
  ...compraComun,
  tipoCosto: z.literal('GASTO'),
  items: z.array(itemGastoSchema).min(1),
});

export const registrarCompraSchema = z.union([compraCostoSchema, compraGastoSchema]);
