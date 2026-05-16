// MÓDULO: routes/notes.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de notas del usuario.
//
// MONTAJE EN app.js:
//   app.use('/api/notes', verifyToken, notesRouter)
//   verifyToken ya protege todas las rutas — req.usuario.id
//   está disponible en los controladores sin verificación adicional.

// Importamos Router de express para crear un enrutador modular
// Router permite separar las rutas de notas del servidor principal en app.js
import { Router } from 'express';

// Importamos los tres controladores que manejan las operaciones de notas
// obtenerNotas — lista todas las notas del usuario autenticado
// crearNota    — inserta una nota nueva asociada al usuario autenticado
// eliminarNota — borra una nota si pertenece al usuario autenticado
import { obtenerNotas, crearNota, eliminarNota } from '../controller/notes.controller.js';

// Creamos la instancia del enrutador — este objeto registra las rutas de notas
// y se monta en app.js bajo el prefijo /api/notes
const router = Router();

// GET /api/notes — retorna todas las notas del usuario autenticado
// El controlador obtenerNotas lee req.usuario.id del token para filtrar solo sus notas
router.get('/', obtenerNotas);

// POST /api/notes — crea una nota nueva con el texto y color enviados en el body
// El controlador crearNota asocia la nota al usuario autenticado mediante req.usuario.id
router.post('/', crearNota);

// DELETE /api/notes/:id — elimina la nota con el id indicado en la URL
// El controlador eliminarNota verifica que la nota pertenezca al usuario autenticado
// antes de borrarla — un usuario no puede borrar las notas de otro
router.delete('/:id', eliminarNota);

// Exportamos el enrutador para que app.js lo registre bajo /api/notes
export default router;
