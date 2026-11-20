export class AppError extends Error {
  // codigo (opcional): identificador estable para que el frontend reaccione sin comparar textos.
  constructor(mensaje, status = 400, codigo = null) {
    super(mensaje);
    this.status = status;
    this.esAppError = true;
    this.codigo = codigo;
  }
}
