import { Router } from 'express';
import { autenticar } from '../middlewares/auth.js';
import { permitir } from '../middlewares/roles.js';
import { listar, crear, actualizar, cambiarPassword } from '../controllers/usuarios.controller.js';

const r = Router();
r.use(autenticar, permitir('administrador'));
r.get('/', listar);
r.post('/', crear);
r.patch('/:id', actualizar);
r.post('/:id/password', cambiarPassword);
export default r;