import { HttpError } from '../utils/HttpError.js';

export const permitir = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.rol)
    ? next()
    : next(new HttpError(403, 'No tienes permiso para esta operación'));