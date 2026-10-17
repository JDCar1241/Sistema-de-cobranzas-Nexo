import { Router } from 'express';
import { autenticar } from '../middlewares/auth.js';
import { permitir } from '../middlewares/roles.js';
import { porDni, porRuc } from '../controllers/documentos.controller.js';

const r = Router();
r.use(autenticar, permitir('administrador', 'asesor', 'recepcionista'));
r.get('/dni/:dni', porDni);
r.get('/ruc/:ruc', porRuc);
export default r;