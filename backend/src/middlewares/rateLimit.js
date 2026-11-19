import rateLimit from 'express-rate-limit';

// Límite global moderado para toda la API (PDFs de planilla, reportes costosos).
// Generoso para un POS con uso intenso; el login tiene su propio límite estricto.
export const limitadorGlobal = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
});
