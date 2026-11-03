export class AppError extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
    this.esAppError = true;
  }
}
