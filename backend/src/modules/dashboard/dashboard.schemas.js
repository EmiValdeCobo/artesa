import { z } from 'zod';

// Los parámetros de consulta se validan con esquemas estrictos: cualquier parámetro desconocido
// (por ejemplo ?idUsuario=… para intentar ver ventas ajenas) se rechaza con 400.
const sucursal = z.coerce.number({ error: 'La sucursal no es válida' }).int().positive('La sucursal no es válida').optional();
const dias = (max, porDefecto) => z.coerce
  .number({ error: 'El número de días no es válido' })
  .int()
  .min(1, 'Debe ser al menos 1 día')
  .max(max, `Máximo ${max} días`)
  .default(porDefecto);

export const ventasDiariasQuery = z.strictObject({ dias: dias(90, 14), sucursal });

export const topProductosQuery = z.strictObject({
  dias: dias(90, 7),
  limite: z.coerce.number({ error: 'El límite no es válido' }).int().min(1).max(20, 'Máximo 20 productos').default(5),
  sucursal,
});

export const alertasQuery = z.strictObject({ sucursal });
