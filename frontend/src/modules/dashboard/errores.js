// Traducción de errores de red a mensajes para la persona usuaria. Autocontenida a propósito: el módulo del
// dashboard no depende de componentes ni utilidades de errores de otras ramas del proyecto.
// Si el cliente HTTP ya entrega el error traducido (falla.usuario), se respeta tal cual.
export function describirError(falla) {
  if (falla?.usuario) return falla.usuario;
  const estado = falla?.status ?? falla?.response?.status;
  if (estado === 401) return { categoria: 'usuario', titulo: 'Tu sesión terminó', mensaje: 'Por seguridad hay que volver a entrar.', accion: 'Inicia sesión de nuevo.', reintentable: false };
  if (estado === 403) return { categoria: 'usuario', titulo: 'No tienes acceso a esta información', mensaje: 'Tu rol no incluye este bloque.', accion: 'Si lo necesitas, pídelo a un administrador.', reintentable: false };
  if (estado >= 500) return { categoria: 'sistema', titulo: 'No pudimos cargar estos datos', mensaje: 'Hubo un problema de nuestro lado.', accion: 'Inténtalo de nuevo en un momento.', reintentable: true };
  if (!estado) return { categoria: 'usuario', titulo: 'Sin conexión con el servidor', mensaje: 'No se pudo completar la consulta.', accion: 'Revisa tu conexión e inténtalo de nuevo.', reintentable: true };
  return { categoria: 'usuario', titulo: 'No se pudo cargar', mensaje: 'La consulta no se completó.', accion: 'Inténtalo de nuevo.', reintentable: true };
}
