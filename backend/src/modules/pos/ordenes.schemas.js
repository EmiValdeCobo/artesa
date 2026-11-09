import { z } from 'zod';

// ── Ítem de orden ─────────────────────────────────────────────────────────────
const itemSchema = z.object({
  id_producto: z.number().int().positive(),
  cantidad:    z.number().int().min(1),
  nota:        z.string().max(255).nullable().optional(),
});

// ── POST /api/pos/ordenes ─────────────────────────────────────────────────────
export const crearOrdenSchema = z.object({
  id_turno:   z.string().uuid({ message: 'id_turno debe ser un UUID válido' }),
  canal:      z.enum(['MESA', 'LLEVAR', 'DOMICILIO'], {
    errorMap: () => ({ message: "canal debe ser 'MESA', 'LLEVAR' o 'DOMICILIO'" }),
  }),
  etiqueta:   z.string().min(1).max(100),
  id_cliente: z.string().uuid().nullable().optional(),
  notas:      z.string().max(500).nullable().optional(),
  items:      z.array(itemSchema).min(1, { message: 'La orden debe tener al menos un ítem' }),
});

// ── PUT /api/pos/ordenes/:id ──────────────────────────────────────────────────
export const editarOrdenSchema = z.object({
  etiqueta:   z.string().min(1).max(100).optional(),
  id_cliente: z.string().uuid().nullable().optional(),
  notas:      z.string().max(500).nullable().optional(),
  items:      z.array(itemSchema).min(1).optional(),
});

// ── PATCH /api/pos/ordenes/:id/estado ────────────────────────────────────────
export const cambiarEstadoOrdenSchema = z.object({
  estado: z.enum(['EN_PREPARACION', 'LISTA', 'ENTREGADA', 'ANULADA'], {
    errorMap: () => ({ message: "estado debe ser EN_PREPARACION, LISTA, ENTREGADA o ANULADA" }),
  }),
});

