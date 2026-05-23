// MODULO: routes/calendar.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad unica: definir que funcion del controlador
// maneja cada combinacion de metodo HTTP + ruta de calendario.
//
// REGLA CRITICA DE ORDEN:
//   Las rutas /instructor y /usuario deben ir ANTES de /:id
//   para que Express no las capture como parametros dinamicos.
//   Si /:id estuviera primero, Express capturaria "instructor" y "usuario"
//   como valores del parametro id y nunca llegaria a esas rutas especificas.
//
// MONTAJE EN app.js:
//   app.use('/api/calendar', verifyToken, calendarRouter)
//   verifyToken ya protege todas las rutas  req.usuario.id
//   esta disponible en los controladores sin verificacion adicional.

// Importamos Router de express para crear un enrutador modular
// Router permite separar las rutas del calendario del servidor principal en app.js
import { Router } from 'express';

// Importamos los cuatro controladores que manejan los eventos del calendario
// getEventosInstructor  lista los eventos creados por el instructor autenticado
// getEventosUsuario     lista los eventos asignados al estudiante autenticado
// crearEvento           inserta un evento nuevo en la tabla calendar_events
// eliminarEvento        borra un evento si pertenece al usuario autenticado
import {
    getEventosInstructor,
    getEventosUsuario,
    crearEvento,
    eliminarEvento,
} from '../controller/calendar.controller.js';

// Importamos requireAdminOrInstructor para proteger los endpoints del panel del instructor
// Solo admin e instructor pueden ver la lista completa de eventos que crearon
import { requireAdminOrInstructor } from '../middlewares/auth.middleware.js';

// Creamos la instancia del enrutador  este objeto registra las rutas del calendario
// y se monta en app.js bajo el prefijo /api/calendar
const router = Router();

// ── RUTAS SIN PARAMETRO DINAMICO (van PRIMERO) ─────────────────────────────

// GET /api/calendar/instructor  retorna todos los eventos creados por el instructor autenticado
// requireAdminOrInstructor verifica que el usuario tenga rol admin o instructor
// El controlador usa req.usuario.id para filtrar los eventos de ese instructor en la BD
router.get('/instructor', requireAdminOrInstructor, getEventosInstructor);

// GET /api/calendar/usuario  retorna los eventos asignados al estudiante autenticado
// No requiere middleware adicional  todos los usuarios autenticados pueden ver su calendario
// El controlador usa req.usuario.id para filtrar los eventos asignados a ese estudiante
router.get('/usuario', getEventosUsuario);

// ── CRUD ────────────────────────────────────────────────────────────────────

// POST /api/calendar  crea un evento nuevo en la tabla calendar_events
// El controlador crearEvento lee req.usuario.id para asignarlo como instructor_id del evento
router.post('/', crearEvento);

// DELETE /api/calendar/:id  elimina el evento con el id indicado en la URL
// El controlador eliminarEvento verifica que el evento pertenezca al usuario autenticado
// antes de borrarlo  un usuario no puede borrar eventos que no creo
router.delete('/:id', eliminarEvento);

// Exportamos el enrutador para que app.js lo registre bajo /api/calendar
export default router;
