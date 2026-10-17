export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Envuelve controladores async para que los errores lleguen al manejador
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);