import { z } from 'zod';

const idPositivo = z.number().int().positive();

const fechaCalendario = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
  .refine((valor) => {
    const [anio, mes, dia] = valor.split('-').map(Number);
    const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
    const diasMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return anio >= 1 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasMes[mes - 1];
  }, 'La fecha no es válida');

function fechaActualElSalvador() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const valor = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

function fechaLimiteAntiguedad(fechaActual) {
  const [anio, mes, dia] = fechaActual.split('-').map(Number);
  const fechaMesLimite = new Date(Date.UTC(anio, mes - 7, 1));
  const anioLimite = fechaMesLimite.getUTCFullYear();
  const mesLimite = fechaMesLimite.getUTCMonth() + 1;
  const diaLimite = Math.min(dia, new Date(Date.UTC(anioLimite, mesLimite, 0)).getUTCDate());
  return `${anioLimite}-${String(mesLimite).padStart(2, '0')}-${String(diaLimite).padStart(2, '0')}`;
}

const fechaEmision = fechaCalendario.superRefine((valor, contexto) => {
  const hoy = fechaActualElSalvador();
  if (valor > hoy) contexto.addIssue({ code: 'custom', message: 'La fecha de emisión no puede ser futura' });
  if (valor < fechaLimiteAntiguedad(hoy)) {
    contexto.addIssue({ code: 'custom', message: 'La fecha de emisión no puede tener más de seis meses' });
  }
});

const cantidad = z.string().trim()
  .regex(/^\d{1,8}$/, 'La cantidad debe ser un entero positivo de hasta 8 dígitos')
  .refine((valor) => /[1-9]/.test(valor), 'La cantidad debe ser mayor a cero');

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
  fechaEmision,
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

export const registrarCompraSchema = z.union([compraCostoSchema, compraGastoSchema]).refine(
  (compra) => compra.items.some((item) => /[1-9]/.test(item.costoUnitario.replace('.', ''))),
  { message: 'La compra debe tener un total mayor que cero', path: ['items'] },
);
