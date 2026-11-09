import { z } from 'zod';

const idPositivo = z.coerce.number().int().positive();
const idsPermisos = z.array(idPositivo).superRefine((ids, ctx) => {
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'No repitas permisos en la asignación' });
});

const sucursalesSchema = z.array(z.coerce.number().int().positive()).min(1, 'Selecciona al menos una sucursal').superRefine((sucursales, ctx) =>
  {
    if (new Set(sucursales).size !== sucursales.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'No repitas sucursales en la asignación',
      });
    }
  });;

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

const nombreRol = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50);
const descripcionOpcional = z.string().trim().max(500).optional().nullable();

export const crearRolSchema = z.object({
  nombre: nombreRol,
  descripcion: descripcionOpcional,
});

export const actualizarRolSchema = crearRolSchema;

export const crearPermisoSchema = z.object({
  codigo: z.string().trim().min(2).max(80).regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/, 'El código debe usar MAYÚSCULAS y guiones bajos'),
  modulo: z.string().trim().min(2).max(50),
  descripcion: descripcionOpcional,
});

export const actualizarPermisoSchema = crearPermisoSchema;
export const asignarPermisosSchema = z.object({ idPermisos: idsPermisos });
export const idRolSchema = idPositivo;
export const idPermisoSchema = idPositivo;

