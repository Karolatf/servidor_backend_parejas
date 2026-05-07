// MÓDULO: routes/notes.routes.js
//
// MONTAJE EN app.js:
//   import notesRouter from './routes/notes.routes.js';
//   app.use('/api/notes', verifyToken, notesRouter);

import { Router } from 'express';
import { obtenerNotas, crearNota, eliminarNota } from '../controller/notes.controller.js';

const router = Router();

router.get('/',     obtenerNotas);   // GET    /api/notes
router.post('/',    crearNota);      // POST   /api/notes
router.delete('/:id', eliminarNota); // DELETE /api/notes/:id

export default router;