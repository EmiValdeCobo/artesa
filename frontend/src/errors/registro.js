// Registro de errores técnicos. Aquí (y solo aquí) viven los detalles internos:
// estado HTTP, endpoint, texto crudo del servidor, stack. Nunca se muestran en pantalla.
// Para enviarlos a un servicio externo (Sentry, etc.) basta con llamar a `configurarRegistro(fn)`.
let destino = null;

export function configurarRegistro(fn) {
  destino = typeof fn === 'function' ? fn : null;
}

export function registrarError(error, contexto = {}) {
  if (error && typeof error === 'object') {
    if (error.registrado) return;
    try { error.registrado = true; } catch { /* objeto congelado */ }
  }
  const detalle = {
    ...contexto,
    nombre: error?.name,
    mensaje: error?.mensajeServidor || error?.message,
    status: error?.status,
    metodo: error?.metodo,
    endpoint: error?.endpoint,
    detalles: error?.detalles?.length ? error.detalles : undefined,
    causa: error?.causa,
  };
  // Los errores que el usuario puede corregir (validación, permisos…) son esperables: advertencia, no error.
  const nivel = error?.usuario?.categoria === 'usuario' ? 'warn' : 'error';
  console[nivel]('[artesa] error', detalle, error?.stack || '');
  try { destino?.(error, detalle); } catch { /* el logger nunca debe romper la app */ }
}
