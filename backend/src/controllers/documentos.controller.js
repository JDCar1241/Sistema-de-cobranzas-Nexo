import { asyncH, HttpError } from '../utils/HttpError.js';
import { consultarDni, consultarRuc } from '../services/consultaDocumento.js';

export const porDni = asyncH(async (req, res) => {
  const { dni } = req.params;
  if (!/^\d{8}$/.test(dni)) throw new HttpError(400, 'El DNI debe tener 8 dígitos');
  res.json(await consultarDni(dni));
});

export const porRuc = asyncH(async (req, res) => {
  const { ruc } = req.params;
  if (!/^20\d{9}$/.test(ruc)) throw new HttpError(400, 'El RUC debe tener 11 dígitos y empezar con 20');
  res.json(await consultarRuc(ruc));
});