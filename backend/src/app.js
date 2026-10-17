import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import documentos from './routes/documentos.routes.js';
import usuarios from './routes/usuarios.routes.js';

const app = express();

app.use(cors({
  origin: (origin, cb) => (!origin || env.frontendUrls.includes(origin) ? cb(null, true) : cb(new Error('Origen no permitido'))),
}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api/documentos', documentos);
app.use('/api/usuarios', usuarios);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Error interno del servidor' : err.message });
});

export default app;