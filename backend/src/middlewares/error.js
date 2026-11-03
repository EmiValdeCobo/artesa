import { ZodError } from 'zod';

export const notFound = (req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });

// Convierte cualquier error en una respuesta JSON consistente { error, detalles? }
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (err.esAppError) return res.status(err.status).json({ error: err.message });

  // Errores de PostgreSQL
  if (err.code === 'P0001') return res.status(400).json({ error: err.message });            // RAISE EXCEPTION (reglas de negocio)
  if (err.code === '23505') return res.status(409).json({ error: 'El registro ya existe (valor duplicado)' });
  if (err.code === '23503') return res.status(409).json({ error: 'Referencia inválida o registro en uso' });
  if (err.code === '23514' || err.code === '23502') return res.status(400).json({ error: 'Datos no válidos para la base de datos' });

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
