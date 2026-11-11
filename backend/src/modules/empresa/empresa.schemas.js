import { z } from 'zod';

export const sucursalSchema = z.object({
  codigoEstablecimiento: z.string().trim().regex(/^[A-Z0-9]{4}$/i).transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(2).max(100),
  direccion: z.string().trim().min(3).max(500),
  departamento: z.string().trim().min(2).max(50),
  telefono: z.string().trim().max(20).nullable().optional(),
  activa: z.boolean().default(true),
});
export const parametroSchema = z.object({ clave: z.string().trim().min(1).max(60), valor: z.string().trim().min(1).max(100) });
