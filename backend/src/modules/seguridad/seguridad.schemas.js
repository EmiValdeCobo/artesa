import { z } from 'zod';

const sucursalesSchema = z.array(z.coerce.number().int().positive()).min(1, 'Selecciona al menos una sucursal');

export const crearUsuarioSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'El usuario contiene caracteres no válidos'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  idRol: z.coerce.number().int().positive(),
  sucursales: sucursalesSchema,
});

export const actualizarUsuarioSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'El usuario contiene caracteres no válidos'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional().or(z.literal('')),
  idRol: z.coerce.number().int().positive(),
  sucursales: sucursalesSchema,
});

