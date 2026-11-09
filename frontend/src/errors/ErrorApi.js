// Error técnico de una llamada a la API. Conserva TODO el detalle crudo para los logs,
// pero su `message` es siempre el texto ya traducido para el usuario (ver traducirError.js),
// de modo que el código existente que hace `setError(err.message)` nunca muestra texto crudo.
export class ErrorApi extends Error {
  constructor({ status = 0, mensajeServidor = '', codigo = null, detalles = [], endpoint = '', metodo = 'GET', tipoFallo = null, causa = null }) {
    super(mensajeServidor || 'Error de API');
    this.name = 'ErrorApi';
    this.status = status;            // 0 si nunca hubo respuesta HTTP
    this.mensajeServidor = mensajeServidor; // NUNCA mostrar al usuario
    this.codigo = codigo;            // código estable del backend, si existe
    this.detalles = detalles;        // [{ campo, mensaje }] de validación Zod
    this.endpoint = endpoint;
    this.metodo = metodo;
    this.tipoFallo = tipoFallo;      // 'red' | 'timeout' | null
    this.causa = causa;
    this.usuario = null;             // lo rellena client.js con el ErrorUsuario traducido
  }
}
